<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Models\KpiDailyScore;
use App\Models\KpiMonthlyScore;
use App\Models\KpiWeeklyScore;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class KpiCeoController extends Controller
{
    public function index(Request $request): Response
    {
        $date = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $positionFilter = $request->input('position', 'all');

        $scoreQuery = KpiDailyScore::with('user.jobPosition')
            ->where('score_date', $date);

        if ($positionFilter === 'hr') {
            $scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager HR'));
        } elseif ($positionFilter === 'operational') {
            $scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Operasional'));
        }

        $allScores = $scoreQuery->orderBy('total_score', 'desc')->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'user' => [
                    'id' => $s->user->id,
                    'name' => $s->user->name,
                    'email' => $s->user->email,
                    'job_position' => $s->user->jobPosition ? [
                        'id' => $s->user->jobPosition->id,
                        'name' => $s->user->jobPosition->name,
                    ] : null,
                ],
                'total_score' => (float) $s->total_score,
                'grade' => $s->grade,
                'verified_tasks' => $s->verified_tasks,
                'total_tasks' => $s->total_tasks,
                'completed_tasks' => $s->completed_tasks,
            ]);

        $gradeDistribution = KpiDailyScore::where('score_date', $date)
            ->select('grade', DB::raw('count(*) as count'))
            ->groupBy('grade')
            ->get()
            ->pluck('count', 'grade');

        $hrScores = $allScores->filter(
            fn ($s) => $s['user']['job_position']['name'] === 'Manager HR'
        )->values();

        $opsScores = $allScores->filter(
            fn ($s) => $s['user']['job_position']['name'] === 'Manager Operasional'
        )->values();

        $criticalAlerts = $allScores->filter(fn ($s) => $s['grade'] === 'D')->values();

        $lateReports = KpiDailyReport::where('is_late', true)
            ->where('report_date', $date)
            ->with('user')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'user' => ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email],
                'submitted_at' => $r->submitted_at,
            ]);

        $managerPositionUserIds = User::whereHas('jobPosition', fn ($q) => $q->whereIn('name', ['Manager HR', 'Manager Operasional']))->pluck('id');

        $pendingReports = User::whereIn('id', $managerPositionUserIds)
            ->whereDoesntHave('kpiReports', fn ($q) => $q->where('report_date', $date))
            ->get(['id', 'name', 'email']);

        // SPV team overview
        $spvTeam = Team::where('is_spv_team', true)->with('users.jobPosition')->first();
        $spvSummary = null;
        if ($spvTeam) {
            $totalSpvTasks = Task::where('team_id', $spvTeam->id)
                ->whereDate('visit_date', $date)
                ->count();
            $spvSummary = [
                'team_name' => $spvTeam->name,
                'member_count' => $spvTeam->users->count(),
                'tasks_today' => $totalSpvTasks,
            ];
        }

        return Inertia::render('kpi/ceo-dashboard', [
            'allScores' => $allScores->values(),
            'hrScores' => $hrScores,
            'opsScores' => $opsScores,
            'gradeDistribution' => $gradeDistribution,
            'criticalAlerts' => $criticalAlerts,
            'lateReports' => $lateReports,
            'pendingReports' => $pendingReports,
            'spvSummary' => $spvSummary,
            'date' => $date,
            'positionFilter' => $positionFilter,
        ]);
    }

    public function dailyReports(Request $request): Response
    {
        $date = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $reports = KpiDailyReport::with('user')
            ->where('report_date', $date)
            ->latest('submitted_at')
            ->get();

        return Inertia::render('kpi/ceo-reports', [
            'reports' => $reports,
            'date' => $date,
        ]);
    }

    public function alerts(Request $request): Response
    {
        $date = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $gradeDAlerts = KpiDailyScore::where('grade', 'D')
            ->where('score_date', $date)
            ->with('user.jobPosition')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'user' => [
                    'id' => $s->user->id,
                    'name' => $s->user->name,
                    'email' => $s->user->email,
                    'job_position' => $s->user->jobPosition ? ['name' => $s->user->jobPosition->name] : null,
                ],
                'total_score' => (float) $s->total_score,
                'grade' => $s->grade,
                'verified_tasks' => $s->verified_tasks,
                'total_tasks' => $s->total_tasks,
            ]);

        $lateReports = KpiDailyReport::where('is_late', true)
            ->where('report_date', $date)
            ->with('user')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'user' => ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email],
                'submitted_at' => $r->submitted_at,
            ]);

        $managerPositionUserIds = User::whereHas('jobPosition', fn ($q) => $q->whereIn('name', ['Manager HR', 'Manager Operasional']))->pluck('id');

        $missingReports = User::whereIn('id', $managerPositionUserIds)
            ->whereDoesntHave('kpiReports', fn ($q) => $q->where('report_date', $date))
            ->get(['id', 'name', 'email']);

        return Inertia::render('kpi/ceo-alerts', [
            'gradeDAlerts' => $gradeDAlerts,
            'lateReports' => $lateReports,
            'missingReports' => $missingReports,
            'date' => $date,
        ]);
    }

    public function userDetail(User $user, Request $request): Response
    {
        $date = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $dailyScore = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $date)
            ->first();

        $weekStart = Carbon::parse($date)->startOfWeek()->toDateString();
        $weekEnd = Carbon::parse($date)->endOfWeek()->toDateString();

        $weeklyScore = KpiWeeklyScore::where('user_id', $user->id)
            ->where('week_start_date', $weekStart)
            ->first();

        $monthStart = Carbon::parse($date)->startOfMonth()->toDateString();
        $monthlyScore = KpiMonthlyScore::where('user_id', $user->id)
            ->whereDate('month', $monthStart)
            ->first();

        $recentScores = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', '<=', $date)
            ->orderBy('score_date', 'desc')
            ->limit(14)
            ->get()
            ->map(fn ($s) => [
                'date' => $s->score_date->toDateString(),
                'total_score' => (float) $s->total_score,
                'grade' => $s->grade,
                'verified_tasks' => $s->verified_tasks,
                'total_tasks' => $s->total_tasks,
            ]);

        $dailyReport = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $date)
            ->first();

        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'job_position' => $user->jobPosition ? ['id' => $user->jobPosition->id, 'name' => $user->jobPosition->name] : null,
        ];

        return Inertia::render('kpi/ceo-user-detail', [
            'user' => $userData,
            'date' => $date,
            'dailyScore' => $dailyScore ? [
                'total_score' => (float) $dailyScore->total_score,
                'grade' => $dailyScore->grade,
                'verified_tasks' => $dailyScore->verified_tasks,
                'completed_tasks' => $dailyScore->completed_tasks,
                'total_tasks' => $dailyScore->total_tasks,
                'category_breakdown' => $dailyScore->category_breakdown,
                'task_details' => collect($dailyScore->task_details ?? [])->map(fn ($t) => [
                    'task_id' => $t['task_id'] ?? null,
                    'name' => $t['task_name'] ?? $t['name'] ?? '',
                    'category' => $t['category'] ?? '',
                    'weight' => $t['weight'] ?? 0,
                    'is_verified' => $t['verified'] ?? $t['is_verified'] ?? false,
                    'is_done' => $t['completed'] ?? $t['is_done'] ?? false,
                ])->values()->toArray(),
            ] : null,
            'weeklyScore' => $weeklyScore ? [
                'average_score' => (float) $weeklyScore->average_score,
                'grade' => $weeklyScore->grade,
                'week_start_date' => $weeklyScore->week_start_date->toDateString(),
                'week_end_date' => $weeklyScore->week_end_date->toDateString(),
                'category_breakdown' => $weeklyScore->category_breakdown,
            ] : null,
            'monthlyScore' => $monthlyScore ? [
                'average_score' => (float) $monthlyScore->average_score,
                'final_score' => (float) $monthlyScore->final_score,
                'consistency_bonus' => (float) $monthlyScore->consistency_bonus,
                'grade' => $monthlyScore->grade,
                'has_grade_d' => $monthlyScore->has_grade_d,
            ] : null,
            'recentScores' => $recentScores,
            'dailyReport' => $dailyReport ? [
                'id' => $dailyReport->id,
                'submitted_at' => $dailyReport->submitted_at,
                'is_late' => $dailyReport->is_late,
                'status_34_tasks' => $dailyReport->status_34_tasks,
                'spv_status' => $dailyReport->spv_status,
                'issues_today' => $dailyReport->issues_today,
                'follow_up' => $dailyReport->follow_up,
                'action_plan' => $dailyReport->action_plan,
                'report_data' => $dailyReport->report_data,
            ] : null,
        ]);
    }

    public function spvMonitoring(Request $request): Response
    {
        $date = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $authUserId = auth()->id();

        $spvTeam = Team::where('is_spv_team', true)
            ->with(['users.jobPosition'])
            ->first();

        $tasks = collect();
        $members = [];

        if ($spvTeam) {
            // Load all tasks for this date on SPV team (same pattern as KpiDashboardController)
            $tasks = Task::join('teams', 'tasks.team_id', '=', 'teams.id')
                ->where('teams.is_spv_team', true)
                ->whereDate('tasks.visit_date', $date)
                ->select('tasks.*')
                ->with([
                    'store',
                    'creator:id,name,email',
                    'assignees:id,name,email',
                    'kanbanColumn',
                    'media',
                    'comments' => fn ($q) => $q->with(['user', 'media', 'sopStep'])->orderBy('created_at'),
                ])
                ->orderBy('tasks.order_position')
                ->get()
                ->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'title' => $task->title,
                        'description' => $task->description,
                        'visit_date' => $task->getRawOriginal('visit_date'),
                        'due_date' => $task->getRawOriginal('due_date') ? substr($task->getRawOriginal('due_date'), 0, 10) : null,
                        'is_verified' => $task->is_verified,
                        'is_done' => $task->is_verified,
                        'store' => $task->store ? [
                            'id' => $task->store->id,
                            'name' => $task->store->name,
                            'branch_code' => $task->store->branch_code,
                        ] : null,
                        'creator' => $task->creator ? [
                            'id' => $task->creator->id,
                            'name' => $task->creator->name,
                        ] : null,
                        'assignees' => $task->assignees->map(fn ($a) => [
                            'id' => $a->id,
                            'name' => $a->name,
                        ]),
                        'column_name' => $task->kanbanColumn?->name,
                        'media' => $task->media->map(fn ($m) => [
                            'id' => $m->id,
                            'file_name' => $m->file_name,
                            'mime_type' => $m->mime_type,
                            'original_url' => $m->getUrl(),
                        ]),
                        'comments' => $task->comments->map(fn ($c) => [
                            'id' => $c->id,
                            'content' => $c->content,
                            'created_at' => $c->created_at->toISOString(),
                            'parent_id' => $c->parent_id,
                            'user' => $c->user ? ['id' => $c->user->id, 'name' => $c->user->name] : null,
                            'sop_step' => $c->sopStep ? [
                                'sequence_order' => $c->sopStep->sequence_order,
                                'name' => $c->sopStep->name,
                            ] : null,
                            'media' => $c->media->map(fn ($m) => [
                                'id' => $m->id,
                                'file_name' => $m->file_name,
                                'mime_type' => $m->mime_type,
                                'original_url' => $m->getUrl(),
                            ]),
                        ]),
                    ];
                });

            foreach ($spvTeam->users->where('id', '!=', $authUserId) as $member) {
                $memberTasks = $tasks->filter(
                    fn ($t) => collect($t['assignees'])->contains('id', $member->id)
                )->values();

                $members[] = [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'job_position' => $member->jobPosition ? ['name' => $member->jobPosition->name] : null,
                    'tasks' => $memberTasks,
                    'total_tasks' => $memberTasks->count(),
                    'completed_tasks' => $memberTasks->filter(fn ($t) => $t['is_verified'])->count(),
                ];
            }
        }

        $totalTasksToday = $tasks->count();
        $completedTasksToday = $tasks->filter(fn ($t) => $t['is_verified'])->count();

        return Inertia::render('kpi/ceo-spv', [
            'date' => $date,
            'spvTeam' => $spvTeam ? [
                'id' => $spvTeam->id,
                'name' => $spvTeam->name,
            ] : null,
            'members' => $members,
            'totalTasksToday' => $totalTasksToday,
            'completedTasksToday' => $completedTasksToday,
        ]);
    }
}
