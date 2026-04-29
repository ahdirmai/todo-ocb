<?php

namespace App\Http\Controllers;

use App\Enums\GroupingType;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Team;
use App\Models\TeamMessage;
use App\Services\AiReportingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function show(Team $team, string $tab = 'overview', ?string $item = null)
    {
        Gate::authorize('view', $team);

        $team->load(['users' => fn ($q) => $q->withPivot('role')])->loadCount('tasks');
        $isAdmin = auth()->user()->hasAnyRole(['superadmin', 'admin']);

        if ($tab === 'task') {
            $team->load([
                'kanbans.columns.tasks.tags',
                'kanbans.columns.tasks.media',
                'kanbans.columns.tasks.comments.user',
                'kanbans.columns.tasks.comments.media',
                'kanbans.columns.tasks.assignees',
            ]);

            $team->kanbans->each(function (Kanban $kanban): void {
                $kanban->columns->each(function (KanbanColumn $column): void {
                    $column->tasks->loadCount(['comments', 'media']);
                });
            });
        }

        if ($tab === 'overview') {
            $team->load([
                'kanbans.columns' => fn ($q) => $q->withCount('tasks'),
            ]);
        }

        /** @var array<string,mixed> $extraProps */
        $extraProps = [];

        if ($tab === 'activity') {
            abort_unless($isAdmin, 403);

            $extraProps['activityLogs'] = ActivityLog::with('causer')
                ->forTeam($team->id)
                ->latest()
                ->paginate(30);
        }

        if ($tab === 'chat') {
            $extraProps['messages'] = TeamMessage::with('user')
                ->where('team_id', $team->id)
                ->latest()
                ->limit(50)
                ->get()
                ->reverse()
                ->values()
                ->map(fn (TeamMessage $msg) => [
                    'id' => $msg->id,
                    'body' => $msg->body,
                    'created_at' => $msg->created_at->toISOString(),
                    'user' => $msg->user ? [
                        'id' => $msg->user->id,
                        'name' => $msg->user->name,
                        'avatar_url' => $msg->user->avatar_url,
                    ] : null,
                    'attachments' => $msg->getMedia('attachments')->map(fn ($m) => [
                        'id' => $m->id,
                        'name' => $m->file_name,
                        'url' => $m->getUrl(),
                        'mime' => $m->mime_type,
                        'size' => $m->size,
                    ])->toArray(),
                ]);
        }

        if ($tab === 'announcement') {
            $extraProps['announcements'] = Announcement::with([
                'user',
                'media',
                'comments.user',
                'comments.media',
                'comments.replies.user',
                'comments.replies.media',
            ])
                ->where('team_id', $team->id)
                ->latest()
                ->paginate(15);
        }

        if ($tab === 'sop') {
            abort_unless($isAdmin, 403);

            $team->load([
                'kanbans.columns' => fn ($query) => $query->orderBy('order'),
                'documents' => fn ($query) => $query
                    ->where('is_sop', true)
                    ->with(['user', 'media', 'sopSteps.kanbanColumn'])
                    ->latest()
                    ->limit(1),
            ]);

            $sopDocument = $team->documents->first();
            $platforms = app(AiReportingService::class)->platforms();

            $extraProps['sopData'] = [
                'document' => $sopDocument ? [
                    'id' => $sopDocument->id,
                    'name' => $sopDocument->name,
                    'type' => $sopDocument->type,
                    'content_source' => $sopDocument->getAiReadableContent()['source'],
                    'updated_at' => $sopDocument->updated_at?->toISOString(),
                    'steps_count' => $sopDocument->sopSteps->count(),
                    'parse_status' => $sopDocument->sop_parse_status,
                    'parse_platform' => $sopDocument->sop_parse_platform,
                    'parse_error' => $sopDocument->sop_parse_error,
                    'parse_queued_at' => $sopDocument->sop_parse_queued_at?->toISOString(),
                    'parse_started_at' => $sopDocument->sop_parse_started_at?->toISOString(),
                    'parse_completed_at' => $sopDocument->sop_parse_completed_at?->toISOString(),
                ] : null,
                'steps' => $sopDocument
                    ? $sopDocument->sopSteps
                        ->sortBy('sequence_order')
                        ->values()
                        ->map(fn ($step) => [
                            'id' => $step->id,
                            'sequence_order' => $step->sequence_order,
                            'name' => $step->name,
                            'action' => $step->action,
                            'keywords' => $step->keywords ?? [],
                            'required_evidence' => $step->required_evidence,
                            'priority' => $step->priority,
                            'weight' => $step->weight,
                            'min_comment' => $step->min_comment,
                            'min_media' => $step->min_media,
                            'expected_column' => $step->expected_column,
                            'kanban_column_id' => $step->kanban_column_id,
                            'score_kurang' => $step->score_kurang,
                            'score_cukup' => $step->score_cukup,
                            'score_sangat_baik' => $step->score_sangat_baik,
                            'is_mandatory' => $step->is_mandatory,
                        ])
                        ->all()
                    : [],
                'kanban_columns' => $team->kanbans
                    ->flatMap(fn (Kanban $kanban) => $kanban->columns->map(fn (KanbanColumn $column) => [
                        'id' => $column->id,
                        'title' => $column->title,
                        'kanban_name' => $kanban->name,
                        'order' => $column->order,
                    ]))
                    ->values()
                    ->all(),
                'platforms' => $platforms,
                'default_platform' => $platforms[0]['value'] ?? null,
            ];
        }

        return Inertia::render('teams/show', [
            'team' => $team,
            'tab' => $tab,
            'item' => $item,
            ...$extraProps,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'grouping' => 'required|string|in:hq,team,project',
        ]);

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (Team::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $team = Team::create([
            'name' => $validated['name'],
            'grouping' => GroupingType::from($validated['grouping']),
            'slug' => $slug,
        ]);

        // Auto-attach the creating user as admin
        $team->users()->attach(auth()->id(), ['role' => 'admin']);

        // Auto-create default Kanban board
        $kanban = Kanban::create([
            'team_id' => $team->id,
            'name' => 'Papan Utama',
        ]);

        $defaultColumns = ['Backlog', 'In Progress', 'In Review', 'Done'];
        foreach ($defaultColumns as $index => $columnName) {
            KanbanColumn::create([
                'kanban_id' => $kanban->id,
                'title' => $columnName,
                'order' => $index,
                'is_default' => true,
                'is_done' => $columnName === 'Done',
            ]);
        }

        return back();
    }

    public function update(Request $request, Team $team)
    {
        $originalSlug = $team->slug;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'grouping' => 'sometimes|required|string|in:hq,team,project',
            'is_active' => 'sometimes|boolean',
        ]);

        // Regenerate slug only if name changed
        if ($validated['name'] !== $team->name) {
            $slug = Str::slug($validated['name']);
            $baseSlug = $slug;
            $counter = 1;
            while (Team::where('slug', $slug)->where('id', '!=', $team->id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (isset($validated['grouping'])) {
            $validated['grouping'] = GroupingType::from($validated['grouping']);
        }

        $team->update($validated);

        if (($validated['slug'] ?? null) && $validated['slug'] !== $originalSlug) {
            return $this->redirectToUpdatedTeamLocation($request, $team, $originalSlug);
        }

        return back();
    }

    protected function redirectToUpdatedTeamLocation(Request $request, Team $team, string $originalSlug): RedirectResponse
    {
        $previousUrl = $request->headers->get('referer') ?? url()->previous();
        $previousPath = parse_url($previousUrl, PHP_URL_PATH);

        if (! is_string($previousPath)) {
            return back();
        }

        $originalPrefix = "/teams/{$originalSlug}";
        $matchesTeamPrefix = $previousPath === $originalPrefix
            || Str::startsWith($previousPath, "{$originalPrefix}/");

        if (! $matchesTeamPrefix) {
            return back();
        }

        $updatedPath = "/teams/{$team->slug}".Str::after($previousPath, $originalPrefix);
        $previousQuery = parse_url($previousUrl, PHP_URL_QUERY);

        if (is_string($previousQuery) && $previousQuery !== '') {
            $updatedPath .= "?{$previousQuery}";
        }

        return redirect($updatedPath);
    }

    public function archive(Team $team)
    {
        $team->update(['is_active' => false]);

        return back();
    }

    public function restore(Team $team)
    {
        $team->update(['is_active' => true]);

        return back();
    }

    public function destroy(Team $team)
    {
        $team->delete();

        return back();
    }
}
