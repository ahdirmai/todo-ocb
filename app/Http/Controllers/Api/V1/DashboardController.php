<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        $teamIds = Team::query()
            ->when(
                ! $user->hasRole(['superadmin', 'admin']),
                fn ($query) => $query->whereHas('users', fn ($teamQuery) => $teamQuery->whereKey($user->id)),
            )
            ->pluck('id');

        $assignedTasks = Task::query()
            ->whereIn('team_id', $teamIds)
            ->when(
                ! $user->hasRole(['superadmin', 'admin']),
                fn ($query) => $query->whereHas('assignees', fn ($assigneeQuery) => $assigneeQuery->whereKey($user->id)),
            );

        $now = now();

        return response()->json([
            'data' => [
                'role' => $role,
                'generated_at' => Carbon::now()->toISOString(),
                'stats' => [
                    [
                        'key' => 'teams',
                        'label' => 'Teams',
                        'value' => (int) $teamIds->count(),
                    ],
                    [
                        'key' => 'assigned_tasks',
                        'label' => 'Assigned Tasks',
                        'value' => (int) (clone $assignedTasks)->count(),
                    ],
                    [
                        'key' => 'due_soon',
                        'label' => 'Due Soon',
                        'value' => (int) (clone $assignedTasks)
                            ->whereBetween('due_date', [$now->copy()->startOfDay(), $now->copy()->addDays(7)->endOfDay()])
                            ->count(),
                    ],
                    [
                        'key' => 'overdue',
                        'label' => 'Overdue',
                        'value' => (int) (clone $assignedTasks)
                            ->whereNotNull('due_date')
                            ->where('due_date', '<', $now)
                            ->count(),
                    ],
                ],
                'due_soon' => (clone $assignedTasks)
                    ->with(['team:id,name,slug', 'kanbanColumn:id,title'])
                    ->whereBetween('due_date', [$now->copy()->startOfDay(), $now->copy()->addDays(14)->endOfDay()])
                    ->orderBy('due_date')
                    ->limit(10)
                    ->get(['id', 'team_id', 'kanban_column_id', 'title', 'due_date'])
                    ->map(fn (Task $task) => [
                        'id' => $task->id,
                        'title' => $task->title,
                        'team' => [
                            'name' => $task->team?->name,
                            'slug' => $task->team?->slug,
                        ],
                        'column' => [
                            'title' => $task->kanbanColumn?->title,
                        ],
                        'due_date' => $task->due_date?->toISOString(),
                        'due_date_human' => $task->due_date?->diffForHumans(),
                    ])
                    ->values(),
                'activity_feed' => ActivityLog::query()
                    ->whereIn('team_id', $teamIds)
                    ->with('causer:id,name')
                    ->latest()
                    ->limit(10)
                    ->get()
                    ->map(fn (ActivityLog $log) => [
                        'id' => $log->id,
                        'log_name' => $log->log_name,
                        'event' => $log->event,
                        'description' => $log->description,
                        'created_at' => $log->created_at?->toISOString(),
                        'causer' => $log->causer ? [
                            'id' => $log->causer->id,
                            'name' => $log->causer->name,
                        ] : null,
                    ])
                    ->values(),
                'team_snapshots' => Team::query()
                    ->whereIn('id', $teamIds)
                    ->withCount(['tasks', 'documents', 'announcements'])
                    ->orderBy('name')
                    ->limit(10)
                    ->get(['id', 'name', 'slug', 'is_active'])
                    ->map(fn (Team $team) => [
                        'id' => $team->id,
                        'name' => $team->name,
                        'slug' => $team->slug,
                        'is_active' => $team->is_active,
                        'tasks_count' => (int) $team->tasks_count,
                        'documents_count' => (int) $team->documents_count,
                        'announcements_count' => (int) $team->announcements_count,
                    ])
                    ->values(),
            ],
        ]);
    }

    private function resolveRole($user): string
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
