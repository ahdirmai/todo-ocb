<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Document;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $role = $this->resolveDashboardRole($user);

        return Inertia::render('dashboard', [
            'dashboard' => match ($role) {
                'superadmin' => $this->buildSuperadminDashboard(),
                'admin' => $this->buildAdminDashboard(),
                default => $this->buildMemberDashboard($user),
            },
        ]);
    }

    private function buildMemberDashboard(User $user): array
    {
        $now = now();
        $teamIds = Team::query()
            ->whereHas('users', fn (Builder $query) => $query->where('users.id', $user->id))
            ->pluck('teams.id');

        $assignedTasks = Task::query()
            ->whereHas('assignees', fn (Builder $query) => $query->where('users.id', $user->id));

        $stats = [
            [
                'label' => 'Tugas Ditugaskan',
                'value' => (clone $assignedTasks)->count(),
                'description' => 'Seluruh tugas yang sedang atau pernah menjadi tanggung jawabmu.',
            ],
            [
                'label' => 'Tugas Selesai',
                'value' => (clone $assignedTasks)
                    ->whereHas('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
                    ->count(),
                'description' => 'Task yang sudah masuk kolom selesai.',
            ],
            [
                'label' => 'Deadline Pekan Ini',
                'value' => (clone $assignedTasks)
                    ->whereBetween('due_date', [$now->copy()->startOfDay(), $now->copy()->endOfWeek()])
                    ->whereDoesntHave('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
                    ->count(),
                'description' => 'Prioritas yang perlu dipantau sampai akhir pekan.',
            ],
            [
                'label' => 'Terlambat',
                'value' => (clone $assignedTasks)
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', $now)
                    ->whereDoesntHave('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
                    ->count(),
                'description' => 'Task lewat deadline yang belum masuk Done.',
                'tone' => 'danger',
            ],
        ];

        $statusChart = KanbanColumn::query()
            ->join('tasks', 'tasks.kanban_column_id', '=', 'kanban_columns.id')
            ->join('task_user', 'task_user.task_id', '=', 'tasks.id')
            ->where('task_user.user_id', $user->id)
            ->groupBy('kanban_columns.id', 'kanban_columns.title', 'kanban_columns.order')
            ->orderBy('kanban_columns.order')
            ->get([
                'kanban_columns.title as label',
                DB::raw('count(tasks.id) as total'),
            ])
            ->map(fn ($item) => [
                'label' => $item->label,
                'total' => (int) $item->total,
            ])
            ->values();

        $teamLoadChart = Team::query()
            ->whereIn('teams.id', $teamIds)
            ->withCount([
                'tasks as my_tasks_count' => fn (Builder $query) => $query
                    ->whereHas('assignees', fn (Builder $assigneeQuery) => $assigneeQuery->where('users.id', $user->id)),
            ])
            ->orderByDesc('my_tasks_count')
            ->limit(6)
            ->get(['id', 'name', 'slug'])
            ->map(fn (Team $team) => [
                'label' => $team->name,
                'total' => (int) $team->my_tasks_count,
                'slug' => $team->slug,
            ])
            ->values();

        $dueSoon = (clone $assignedTasks)
            ->with(['team:id,name,slug', 'kanbanColumn:id,title'])
            ->whereBetween('due_date', [$now->copy()->startOfDay(), $now->copy()->addDays(14)->endOfDay()])
            ->whereDoesntHave('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
            ->orderBy('due_date')
            ->limit(6)
            ->get(['id', 'team_id', 'kanban_column_id', 'title', 'due_date'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'team' => $task->team?->name,
                'team_slug' => $task->team?->slug,
                'stage' => $task->kanbanColumn?->title,
                'due_date' => optional($task->due_date)?->toDateString(),
                'due_label' => optional($task->due_date)?->diffForHumans(),
            ])
            ->values();

        $teamSnapshots = Team::query()
            ->whereIn('teams.id', $teamIds)
            ->withCount([
                'tasks',
                'documents',
                'announcements',
                'tasks as my_open_tasks_count' => fn (Builder $query) => $query
                    ->whereHas('assignees', fn (Builder $assigneeQuery) => $assigneeQuery->where('users.id', $user->id))
                    ->whereDoesntHave('kanbanColumn', fn (Builder $columnQuery) => $this->applyDoneColumnFilter($columnQuery)),
            ])
            ->orderByDesc('my_open_tasks_count')
            ->limit(5)
            ->get(['id', 'name', 'slug'])
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'tasks' => (int) $team->tasks_count,
                'documents' => (int) $team->documents_count,
                'announcements' => (int) $team->announcements_count,
                'my_open_tasks' => (int) $team->my_open_tasks_count,
            ])
            ->values();

        return [
            'role' => 'member',
            'headline' => [
                'eyebrow' => 'Personal cockpit',
                'title' => 'Fokus pada tugas yang paling perlu kamu dorong hari ini.',
                'description' => 'Dashboard member menonjolkan prioritas pribadi: apa yang harus selesai, tim mana yang paling padat, dan deadline mana yang mulai memanas.',
            ],
            'stats' => $stats,
            'statusChart' => $statusChart,
            'teamLoadChart' => $teamLoadChart,
            'dueSoon' => $dueSoon,
            'teamSnapshots' => $teamSnapshots,
            'activityFeed' => $this->buildActivityFeed(ActivityLog::query()->whereIn('team_id', $teamIds)->latest()->limit(8)),
        ];
    }

    private function buildAdminDashboard(): array
    {
        return [
            'role' => 'admin',
            'headline' => [
                'eyebrow' => 'Operations view',
                'title' => 'Pantau eksekusi tim aktif dan tangkap hambatan sebelum berubah jadi bottleneck.',
                'description' => 'Dashboard admin berfokus pada kesehatan operasional: beban tim, distribusi task, aktivitas terbaru, dan daftar tim yang perlu perhatian.',
            ],
            ...$this->buildOperationsDataset(includeArchived: false),
        ];
    }

    private function buildSuperadminDashboard(): array
    {
        $operations = $this->buildOperationsDataset(includeArchived: true);

        $groupingBreakdown = Team::query()
            ->select('grouping')
            ->selectRaw('count(*) as total')
            ->groupBy('grouping')
            ->orderBy('grouping')
            ->get()
            ->map(fn (Team $team) => [
                'label' => strtoupper((string) $team->grouping->value),
                'total' => (int) $team->total,
            ])
            ->values();

        $roleDistribution = Role::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->get(['name'])
            ->map(fn (Role $role) => [
                'label' => ucfirst($role->name),
                'total' => (int) $role->users_count,
            ])
            ->values();

        $contentMix = collect([
            ['label' => 'Dokumen', 'total' => Document::query()->count()],
            ['label' => 'SOP', 'total' => Document::query()->where('is_sop', true)->count()],
            ['label' => 'Pengumuman', 'total' => Announcement::query()->count()],
            ['label' => 'Komentar', 'total' => Comment::query()->count()],
            ['label' => 'Pesan Tim', 'total' => TeamMessage::query()->count()],
        ]);

        return [
            'role' => 'superadmin',
            'headline' => [
                'eyebrow' => 'Portfolio command center',
                'title' => 'Lihat kesehatan operasional lintas unit, role, dan knowledge base dari satu kanvas.',
                'description' => 'Mode superadmin menggabungkan pandangan operasional dengan sinyal portofolio: persebaran unit, distribusi role, dan kepadatan aset pengetahuan.',
            ],
            ...$operations,
            'portfolioStats' => [
                [
                    'label' => 'Total User',
                    'value' => User::query()->count(),
                    'description' => 'Akun yang aktif di sistem tanpa membedakan role.',
                ],
                [
                    'label' => 'Tim Aktif',
                    'value' => Team::query()->where('is_active', true)->count(),
                    'description' => 'Tim yang sedang berjalan dan tampil di workspace utama.',
                ],
                [
                    'label' => 'Tim Arsip',
                    'value' => Team::query()->where('is_active', false)->count(),
                    'description' => 'Tim nonaktif yang masih menjadi bagian dari histori organisasi.',
                ],
                [
                    'label' => 'SOP Tersimpan',
                    'value' => Document::query()->where('is_sop', true)->count(),
                    'description' => 'Dokumen SOP yang bisa dipakai sebagai baseline proses kerja.',
                ],
            ],
            'groupingBreakdown' => $groupingBreakdown,
            'roleDistribution' => $roleDistribution,
            'contentMix' => $contentMix,
        ];
    }

    private function buildOperationsDataset(bool $includeArchived): array
    {
        $teamIds = Team::query()
            ->when(! $includeArchived, fn (Builder $query) => $query->where('is_active', true))
            ->pluck('teams.id');

        $stats = [
            [
                'label' => $includeArchived ? 'Total Tim' : 'Tim Aktif',
                'value' => $includeArchived
                    ? Team::query()->count()
                    : Team::query()->where('is_active', true)->count(),
                'description' => $includeArchived
                    ? 'Semua tim, termasuk yang sudah diarsipkan.'
                    : 'Tim yang saat ini berjalan dan bisa diakses anggota.',
            ],
            [
                'label' => 'Member Terjangkau',
                'value' => (int) DB::table('team_user')
                    ->join('teams', 'teams.id', '=', 'team_user.team_id')
                    ->when(! $includeArchived, fn ($query) => $query->where('teams.is_active', true))
                    ->distinct('team_user.user_id')
                    ->count('team_user.user_id'),
                'description' => 'Jumlah user unik yang terlibat di tim dalam cakupan dashboard ini.',
            ],
            [
                'label' => 'Open Tasks',
                'value' => Task::query()
                    ->whereIn('team_id', $teamIds)
                    ->whereDoesntHave('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
                    ->count(),
                'description' => 'Task yang belum masuk kolom selesai.',
            ],
            [
                'label' => 'Overdue Tasks',
                'value' => Task::query()
                    ->whereIn('team_id', $teamIds)
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', now())
                    ->whereDoesntHave('kanbanColumn', fn (Builder $query) => $this->applyDoneColumnFilter($query))
                    ->count(),
                'description' => 'Pekerjaan lewat SLA yang masih butuh intervensi.',
                'tone' => 'danger',
            ],
        ];

        $tasksByTeam = Team::query()
            ->whereIn('teams.id', $teamIds)
            ->withCount([
                'tasks as open_tasks_count' => fn (Builder $query) => $query
                    ->whereDoesntHave('kanbanColumn', fn (Builder $columnQuery) => $this->applyDoneColumnFilter($columnQuery)),
            ])
            ->orderByDesc('open_tasks_count')
            ->limit(8)
            ->get(['id', 'name', 'slug'])
            ->map(fn (Team $team) => [
                'label' => $team->name,
                'total' => (int) $team->open_tasks_count,
                'slug' => $team->slug,
            ])
            ->values();

        $tasksByStage = KanbanColumn::query()
            ->join('kanbans', 'kanbans.id', '=', 'kanban_columns.kanban_id')
            ->join('tasks', 'tasks.kanban_column_id', '=', 'kanban_columns.id')
            ->whereIn('kanbans.team_id', $teamIds)
            ->groupBy('kanban_columns.id', 'kanban_columns.title', 'kanban_columns.order')
            ->orderBy('kanban_columns.order')
            ->get([
                'kanban_columns.title as label',
                DB::raw('count(tasks.id) as total'),
            ])
            ->map(fn ($item) => [
                'label' => $item->label,
                'total' => (int) $item->total,
            ])
            ->values();

        $attentionTeams = Team::query()
            ->whereIn('teams.id', $teamIds)
            ->withCount([
                'users',
                'documents',
                'announcements',
                'tasks',
                'tasks as open_tasks_count' => fn (Builder $query) => $query
                    ->whereDoesntHave('kanbanColumn', fn (Builder $columnQuery) => $this->applyDoneColumnFilter($columnQuery)),
                'tasks as overdue_tasks_count' => fn (Builder $query) => $query
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', now())
                    ->whereDoesntHave('kanbanColumn', fn (Builder $columnQuery) => $this->applyDoneColumnFilter($columnQuery)),
            ])
            ->orderByDesc('overdue_tasks_count')
            ->orderByDesc('open_tasks_count')
            ->limit(6)
            ->get(['id', 'name', 'slug', 'is_active'])
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'is_active' => $team->is_active,
                'members' => (int) $team->users_count,
                'tasks' => (int) $team->tasks_count,
                'open_tasks' => (int) $team->open_tasks_count,
                'overdue_tasks' => (int) $team->overdue_tasks_count,
                'documents' => (int) $team->documents_count,
                'announcements' => (int) $team->announcements_count,
            ])
            ->values();

        return [
            'stats' => $stats,
            'tasksByTeam' => $tasksByTeam,
            'tasksByStage' => $tasksByStage,
            'activityTrend' => $this->buildActivityTrend(ActivityLog::query()->whereIn('team_id', $teamIds), 14),
            'attentionTeams' => $attentionTeams,
            'activityFeed' => $this->buildActivityFeed(ActivityLog::query()->whereIn('team_id', $teamIds)->latest()->limit(8)),
        ];
    }

    private function buildActivityTrend(Builder $query, int $days): Collection
    {
        $startDate = now()->subDays($days - 1)->startOfDay();
        $rawTrend = (clone $query)
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw('count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date');

        return collect(range(0, $days - 1))
            ->map(function (int $offset) use ($rawTrend, $startDate): array {
                $date = $startDate->copy()->addDays($offset)->toDateString();

                return [
                    'label' => Carbon::parse($date)->locale('id')->isoFormat('DD MMM'),
                    'total' => (int) ($rawTrend[$date] ?? 0),
                ];
            })
            ->values();
    }

    private function buildActivityFeed(Builder $query): Collection
    {
        return (clone $query)
            ->with('team:id,name,slug')
            ->get(['id', 'log_name', 'event', 'description', 'team_id', 'created_at'])
            ->map(fn (ActivityLog $activity) => [
                'id' => $activity->id,
                'log_name' => $activity->log_name,
                'event' => $activity->event,
                'description' => $activity->description,
                'team' => $activity->team?->name,
                'team_slug' => $activity->team?->slug,
                'created_at' => $activity->created_at->toISOString(),
                'created_label' => $activity->created_at->diffForHumans(),
            ])
            ->values();
    }

    private function applyDoneColumnFilter(Builder $query): void
    {
        $query->whereRaw('LOWER(title) like ?', ['%done%']);
    }

    private function resolveDashboardRole(User $user): string
    {
        if ($user->hasRole('superadmin')) {
            return 'superadmin';
        }

        if ($user->hasRole('admin')) {
            return 'admin';
        }

        return 'member';
    }
}
