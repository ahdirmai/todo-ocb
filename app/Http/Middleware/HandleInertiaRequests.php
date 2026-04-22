<?php

namespace App\Http\Middleware;

use App\Models\Tag;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
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
        $isAdmin = $user?->hasAnyRole(['superadmin', 'admin']);

        // Admins see all active teams; members see only their assigned teams
        $activeTeamsQuery = Team::where('is_active', true);
        if ($user && ! $isAdmin) {
            $activeTeamsQuery->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
        }
        $activeTeams = rescue(fn () => $activeTeamsQuery->get()->groupBy(fn ($t) => $t->grouping->value), collect());
        $allTeams = rescue(fn () => Team::all()->groupBy(fn ($t) => $t->grouping->value), collect());

        // All application users for invite dropdowns (shared to all pages)
        $allUsers = rescue(fn () => User::with('roles:id,name')->orderBy('name')->get(['id', 'name', 'email']), []);

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'avatar_url' => $user->avatar_url,
                ]) : null,
                'roles' => $user ? $user->getRoleNames() : [],
                'permissions' => $user ? $user->getAllPermissions()->pluck('name') : [],
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
        ];
    }
}
