<?php

namespace App\Http\Middleware;

use App\Models\FeedbackCycle;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\Tag;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $isAdmin = $user?->hasAnyRole(['superadmin', 'admin']) ?? false;

        // Admins see all active teams; members see only their assigned teams
        $activeTeamsQuery = Team::where('is_active', true);
        if ($user && ! $isAdmin) {
            $activeTeamsQuery->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
        }
        $activeTeams = rescue(fn () => $activeTeamsQuery->get()->groupBy(fn ($t) => $t->grouping->value), collect());
        $allTeams = rescue(fn () => Team::all()->groupBy(fn ($t) => $t->grouping->value), collect());

        // All application users for invite dropdowns (shared to all pages)
        $allUsers = rescue(fn () => User::with('roles:id,name')->orderBy('name')->get(['id', 'name', 'email']), []);

        // Get user's position-based route access
        $positionAccess = [];
        if ($user && $user->position_id) {
            $positionAccess = PositionPermission::where('position_id', $user->position_id)
                ->pluck('route_key')
                ->toArray();
        }

        $activeFeedbackCycle = rescue(fn () => FeedbackCycle::where('is_open', true)->first(['id', 'title', 'description']));

        // Dynamic KPI areas — sidebar is auto-derived from positions, so any
        // position with at least one active KpiTaskDefinition produces a sidebar
        // entry pointing to that position's KPI dashboard. No front-end edit
        // required when a new position with task definitions is added.
        //
        // Inclusion rule (OR):
        //   1. Position has explicit `area_slug` + `has_kpi = true` (standard
        //      case for HR/Gudang/Operational managers — pre-configured).
        //   2. Position has ≥1 active KpiTaskDefinition row even without an
        //      area_slug. This covers positions like "SPV" that were simply
        //      given a task definition without pre-seeding the slug metadata.
        //
        // Slug derivation (group key):
        //   - `area_slug` if set, else `Str::slug($position->name)`. The latter
        //     is deterministic for Indonesian names (`SPV` → `spv`,
        //     `Gudang BJB` → `gudang-bjb`) and avoids collision with the three
        //     known global slugs because of unique substrings.
        //
        // URL resolution (best-effort):
        //   - For area_slug positions: `/{area_slug}/kpi/dashboard` (standard).
        //   - For auto-derived positions: prefer the first matching
        //     PositionPermission.route_key (e.g., `pengawas-svp`), falling back
        //     to `/{slug}/kpi/dashboard` which may 404 if no route exists.
        //     Owner can fix a 404 by adding a PositionPermission row OR setting
        //     `area_slug` on the position.
        //
        // Visibility (server-side, no client-side leakage):
        //   - Admin/superadmin see every area.
        //   - Members see areas matching their `positionAccess` route_keys OR
        //     that include their own position.
        //
        // NOTE: taskCount is intentionally NOT a visibility gate. Managers land
        // on `/<slug>/kpi/dashboard` to GENERATE the first task — hiding the
        // entry when taskCount === 0 would create a chicken-and-egg UX trap.
        $kpiAreas = rescue(function () use ($user, $isAdmin, $positionAccess) {
            // Cache per-user for 60s — the underlying query (Position::query
            // + withCount + permissions eager-load) is small but it runs on
            // every Inertia request, including polling, asset reloads, and
            // partial-reloads. A 60s window keeps sidebar fresh enough for
            // admin edits while cutting per-request SQL to zero in steady
            // state. Cache is invalidated by user-id so admins and members
            // don't bleed into each other's results.
            $userId = $user?->id ?? 'anon';

            return Cache::remember(
                "kpi_areas:user:{$userId}",
                60,
                fn () => $this->computeKpiAreas($user, $isAdmin, $positionAccess)
            );
        }, function (\Throwable $e) {
            // Log + return empty so silent failures surface in Nightwatch/logs
            // instead of producing an empty sidebar with zero diagnostic.
            Log::warning('HandleInertiaRequests: kpiAreas share failed', [
                'exception' => $e->getMessage(),
                'class' => $e::class,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return [];
        });

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'avatar_url' => $user->avatar_url,
                    'jobPosition' => $user->jobPosition ? [
                        'id' => $user->jobPosition->id,
                        'name' => $user->jobPosition->name,
                    ] : null,
                ]) : null,
                'roles' => $user ? $user->getRoleNames() : [],
                'permissions' => $user ? $user->getAllPermissions()->pluck('name') : [],
                'positionAccess' => $positionAccess,
                // kpiAreas lives inside `auth` because the frontend
                // (app-sidebar + use-main-nav) reads `auth.kpiAreas`.
                // If you also want to expose it at top-level for non-
                // auth contexts (e.g., anonymous landing), wrap elsewhere.
                'kpiAreas' => $kpiAreas,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'teamsData' => [
                'hq' => $activeTeams->get('hq', []),
                'team' => $activeTeams->get('team', []),
                'project' => $activeTeams->get('project', []),
            ],
            'allTeamsData' => [
                'hq' => $allTeams->get('hq', []),
                'team' => $allTeams->get('team', []),
                'project' => $allTeams->get('project', []),
            ],
            'tags' => rescue(fn () => Tag::orderBy('name')->get(['id', 'name', 'color']), []),
            'allUsers' => $allUsers,
            'uploads' => [
                'documents' => [
                    'maxFileKb' => (int) config('uploads.documents.max_file_kb'),
                    'maxAttachments' => (int) config('uploads.documents.max_attachments'),
                    'allowedMimes' => config('uploads.documents.allowed_mimes', []),
                ],
            ],
            'activeFeedbackCycle' => $activeFeedbackCycle ? [
                'id' => $activeFeedbackCycle->id,
                'title' => $activeFeedbackCycle->title,
                'description' => $activeFeedbackCycle->description,
            ] : null,
        ];
    }

    /**
     * Phase 8: kpiAreas computation extracted so Cache::remember can cache
     * the result without share() regressing into a nested callback. The
     * binding for $activeTeams / $allTeams etc. stays in share() above —
     * this method only concerns itself with kpiAreas.
     *
     * Visibility rules (server-side, no client-side leakage):
     *   - Admin/superadmin see every area.
     *   - Members see areas matching their `positionAccess` route_keys OR
     *     that include their own position.
     */
    private function computeKpiAreas(?User $user, bool $isAdmin, array $positionAccess): array
    {
        $positions = Position::query()
            ->withCount([
                'kpiDefinitions as active_task_count' => fn ($q) => $q->where('is_active', true),
            ])
            ->with(['permissions:position_id,route_key'])
            ->where(function ($q) {
                $q->where(function ($q1) {
                    $q1->whereNotNull('area_slug')->where('has_kpi', true);
                })->orWhereHas('kpiDefinitions', fn ($sub) => $sub->where('is_active', true));
            })
            ->get(['id', 'area_slug', 'name', 'is_manager']);

        return $positions
            ->groupBy(fn (Position $p) => $p->area_slug ?? Str::slug($p->name))
            ->map(function ($areaPositions, $slug) use ($user, $isAdmin, $positionAccess) {
                $userPositionInArea = $user && $areaPositions->pluck('id')->contains($user->position_id);
                $accessible = $isAdmin
                    || in_array($slug, $positionAccess, true)
                    || $userPositionInArea;

                if (! $accessible) {
                    return null;
                }

                // Prefer the user's own position so the sidebar entry shows
                // the title the user expects, then the manager, then first.
                $primaryPosition = ($user ? $areaPositions->firstWhere('id', $user->position_id) : null)
                    ?? $areaPositions->sortByDesc('is_manager')->first()
                    ?? $areaPositions->first();

                if (! $primaryPosition) {
                    return null;
                }

                $firstPermissionRouteKey = $primaryPosition->permissions->first()?->route_key;

                $dashboardUrl = $primaryPosition->area_slug !== null
                    ? "/{$primaryPosition->area_slug}/kpi/dashboard"
                    : ($firstPermissionRouteKey !== null
                        ? "/{$firstPermissionRouteKey}"
                        : "/{$slug}/kpi/dashboard");

                $label = $primaryPosition->area_slug !== null
                    ? match ($primaryPosition->area_slug) {
                        'hr' => 'HR Area',
                        'gudang' => 'Gudang Area',
                        'operational' => 'Operational',
                        default => ucfirst($primaryPosition->area_slug).' Area',
                    }
                : $primaryPosition->name;

                return [
                    // Cast to string: `$primaryPosition->id` is a UUID
                    // (HasUuids trait). `(int) "019e7b0f-..."` would
                    // collapse to 0 and break the strict === check in
                    // use-main-nav.ts against `auth.user.jobPosition.id`.
                    'primaryPositionId' => (string) $primaryPosition->id,
                    'slug' => $slug,
                    'label' => $label,
                    'positionName' => $primaryPosition->name,
                    'isManager' => (bool) $primaryPosition->is_manager,
                    'dashboardUrl' => $dashboardUrl,
                    'legacyOverviewUrl' => in_array($primaryPosition->area_slug, ['hr', 'gudang', 'operational'], true) ? "/{$primaryPosition->area_slug}" : null,
                    'taskCount' => $areaPositions->sum('active_task_count'),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}
