<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyScore;
use App\Models\KpiMonthlyScore;
use App\Models\KpiWeeklyScore;
use App\Models\Position;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiScoringService;
use App\Services\KpiTaskGenerationService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiDashboardController extends Controller
{
    public function __construct(
        protected KpiScoringService $scoringService,
        protected KpiTaskGenerationService $taskGenerationService
    ) {}

    protected function getPositionArea(): string
    {
        $user = auth()->user();
        $path = request()->path();

        // Admin/superadmin can access any area based on URL
        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            if (str_starts_with($path, 'hr/')) {
                return 'hr';
            }
            if (str_starts_with($path, 'operational/')) {
                return 'operational';
            }
            if (str_starts_with($path, 'gudang/')) {
                return 'gudang';
            }

            // Admin accessing non-KPI area route, fallback to operational
            return 'operational';
        }

        // Regular users: validate position
        $positionName = $user->jobPosition?->name;

        $expectedArea = match (true) {
            $positionName === 'Manager HR' => 'hr',
            $positionName === 'Manager Operasional' => 'operational',
            in_array($positionName, Position::GUDANG_POSITIONS) => 'gudang',
            default => throw new \Exception('Position tidak memiliki akses KPI'),
        };

        $urlArea = null;

        if (str_starts_with($path, 'hr/')) {
            $urlArea = 'hr';
        } elseif (str_starts_with($path, 'operational/')) {
            $urlArea = 'operational';
        } elseif (str_starts_with($path, 'gudang/')) {
            $urlArea = 'gudang';
        }

        // Validate URL area matches user position
        if ($urlArea && $urlArea !== $expectedArea) {
            abort(403, 'Akses ditolak. Posisi Anda: '.$positionName);
        }

        return $expectedArea;
    }

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $selectedDate = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $positionName = $user->jobPosition?->name;
        $isManager = in_array($positionName, ['Manager HR', 'Manager Operasional']);
        $isGudang = in_array($positionName, Position::GUDANG_POSITIONS);
        $isAdmin = $user->hasAnyRole(['admin', 'superadmin']);

        // Determine if user is viewing as SPV or Manager
        $team = $user->teams()->where('is_spv_team', true)->first();
        $isSpv = (bool) $team;

        // Admin/superadmin, managers, gudang positions, or SPV team members can access
        if (! $isAdmin && ! $isManager && ! $isGudang && ! $isSpv) {
            $area = $this->getPositionArea();

            return Inertia::render("{$area}/kpi/no-access", [
                'message' => 'Anda tidak memiliki akses ke KPI Dashboard',
            ]);
        }

        // Gudang area + admin viewer without gudang position: monitoring mode
        $area = $this->getPositionArea();
        if ($area === 'gudang' && $isAdmin && ! $isGudang) {
            return $this->gudangMonitoring($request, $selectedDate);
        }

        $dailyScore = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $selectedDate)
            ->first();

        $dateScore = $dailyScore ? [
            'score_date' => $dailyScore->score_date,
            'total_score' => (float) $dailyScore->total_score,
            'completed_weight' => (float) $dailyScore->completed_weight,
            'total_weight' => (float) $dailyScore->total_weight,
            'total_tasks' => $dailyScore->total_tasks,
            'completed_tasks' => $dailyScore->completed_tasks,
            'verified_tasks' => $dailyScore->verified_tasks,
            'grade' => $dailyScore->grade,
            'category_breakdown' => $dailyScore->category_breakdown,
        ] : null;

        // Manager's / gudang position's own KPI tasks
        if ($isManager || $isGudang) {
            $dateTasks = Task::where('is_kpi_task', true)
                ->where('creator_id', $user->id)
                ->whereDate('created_at', $selectedDate)
                ->with(['kpiDefinition', 'comments.user', 'comments.media', 'creator:id,name,email', 'team:id,name'])
                ->orderBy('order_position')
                ->get();
        } else {
            $dateTasks = Task::where('is_kpi_task', true)
                ->where('team_id', $team->id)
                ->where('creator_id', $user->id)
                ->whereDate('created_at', $selectedDate)
                ->with(['kpiDefinition', 'comments.user', 'comments.media', 'creator:id,name,email', 'team:id,name'])
                ->orderBy('order_position')
                ->get();
        }

        $dateTasks = $dateTasks->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'category' => $task->kpiDefinition?->category,
                'task_name' => $task->kpiDefinition?->task_name ?? $task->title,
                'weight' => $task->kpiDefinition?->weight,
                'description' => $task->description,
                'is_done' => $task->is_verified,
                'is_verified' => $task->is_verified,
                'is_kpi_task' => $task->is_kpi_task,
                'comment_count' => $task->comments->count(),
                'has_media' => $task->comments->some(fn ($c) => $c->hasMedia()),
                'creator' => [
                    'name' => $task->creator?->name,
                    'email' => $task->creator?->email,
                ],
                'team' => [
                    'name' => $task->team?->name,
                ],
                'comments' => $task->comments->map(fn ($comment) => [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'created_at' => $comment->created_at->toDateTimeString(),
                    'user' => [
                        'id' => $comment->user?->id,
                        'name' => $comment->user?->name,
                        'email' => $comment->user?->email,
                    ],
                    'media' => $comment->getMedia('documents')->map(fn ($media) => [
                        'id' => $media->id,
                        'name' => $media->file_name,
                        'original_url' => $media->getUrl(),
                        'mime_type' => $media->mime_type,
                    ]),
                ]),
            ];
        });

        // SPV team kanban tasks (managers and admins)
        $spvKanbanTasks = collect();
        if ($isManager || $isAdmin) {
            $spvKanbanTasks = Task::join('teams', 'tasks.team_id', '=', 'teams.id')
                ->where('teams.is_spv_team', true)
                ->whereDate('tasks.visit_date', $selectedDate)
                ->select('tasks.*')
                ->with(['kpiDefinition', 'comments.user', 'comments.media', 'creator:id,name,email', 'team:id,name', 'assignees:id,name,email', 'tags:id,name,color'])
                ->orderBy('order_position')
                ->get()
                ->map(function ($task) {
                    $rawDueDate = $task->getRawOriginal('due_date');

                    return [
                        'id' => $task->id,
                        'title' => $task->title,
                        'category' => $task->kpiDefinition?->category,
                        'task_name' => $task->kpiDefinition?->task_name ?? $task->title,
                        'weight' => $task->kpiDefinition?->weight,
                        'description' => $task->description,
                        'visit_date' => $task->getRawOriginal('visit_date'),
                        'due_date' => $rawDueDate ? (is_string($rawDueDate) ? substr($rawDueDate, 0, 10) : $rawDueDate) : null,
                        'is_done' => $task->is_verified,
                        'is_verified' => $task->is_verified,
                        'is_kpi_task' => $task->is_kpi_task,
                        'column_id' => $task->column_id,
                        'kanban_id' => $task->kanban_id,
                        'order_position' => $task->order_position,
                        'comment_count' => $task->comments->count(),
                        'has_media' => $task->comments->some(fn ($c) => $c->hasMedia()),
                        'creator' => [
                            'id' => $task->creator?->id,
                            'name' => $task->creator?->name,
                            'email' => $task->creator?->email,
                        ],
                        'creator_id' => $task->creator_id,
                        'team' => [
                            'id' => $task->team?->id,
                            'name' => $task->team?->name,
                        ],
                        'assignees' => $task->assignees->map(fn ($assignee) => [
                            'id' => $assignee->id,
                            'name' => $assignee->name,
                            'email' => $assignee->email,
                        ]),
                        'tags' => $task->tags->map(fn ($tag) => [
                            'id' => $tag->id,
                            'name' => $tag->name,
                            'color' => $tag->color,
                        ]),
                        'comments' => $task->comments->map(fn ($comment) => [
                            'id' => $comment->id,
                            'content' => $comment->content,
                            'created_at' => $comment->created_at->toDateTimeString(),
                            'user' => [
                                'name' => $comment->user->name,
                                'email' => $comment->user->email,
                            ],
                            'media' => $comment->getMedia('documents')->map(fn ($media) => [
                                'id' => $media->id,
                                'name' => $media->file_name,
                                'original_url' => $media->getUrl(),
                                'mime_type' => $media->mime_type,
                            ]),
                        ]),
                    ];
                });
        }

        $weeklyScores = KpiWeeklyScore::where('user_id', $user->id)
            ->latest('week_start_date')
            ->take(4)
            ->get()
            ->map(function ($score) {
                return [
                    'week_start_date' => $score->week_start_date,
                    'week_end_date' => $score->week_end_date,
                    'average_score' => (float) $score->average_score,
                    'grade' => $score->grade,
                ];
            });

        $monthlyScore = KpiMonthlyScore::where('user_id', $user->id)
            ->whereMonth('month', now())
            ->first();

        if ($monthlyScore) {
            $monthlyScore = [
                'month' => $monthlyScore->month,
                'average_score' => (float) $monthlyScore->average_score,
                'consistency_bonus' => (float) $monthlyScore->consistency_bonus,
                'final_score' => (float) $monthlyScore->final_score,
                'grade' => $monthlyScore->grade,
                'has_grade_d' => (bool) $monthlyScore->has_grade_d,
            ];
        }

        $categoryBreakdown = $dateScore?->category_breakdown ?? [];
        $hasTasksForDate = $dateTasks->isNotEmpty();
        $canGenerateForDate = ! Carbon::parse($selectedDate)->isFuture();

        // Manager HR/Ops and gudang positions can generate their own daily tasks
        $canGenerateTasks = $isManager || $isGudang;

        return Inertia::render("{$area}/kpi/dashboard", [
            'selectedDate' => $selectedDate,
            'dateScore' => $dateScore,
            'dateTasks' => $dateTasks,
            'spvKanbanTasks' => $spvKanbanTasks,
            'weeklyScores' => $weeklyScores,
            'monthlyScore' => $monthlyScore,
            'categoryBreakdown' => $categoryBreakdown,
            'hasTasksForDate' => $hasTasksForDate,
            'canGenerateForDate' => $canGenerateForDate,
            'canGenerateTasks' => $canGenerateTasks,
            'isManager' => $isManager,
        ]);
    }

    public function gudangMonitoring(Request $request, ?string $selectedDate = null): Response
    {
        $selectedDate = $selectedDate ?: now()->toDateString();
        $viewer = auth()->user();
        $isAllowed = $viewer->hasAnyRole(['admin', 'superadmin'])
            || $viewer->jobPosition?->name === 'Manager Gudang';
        abort_unless($isAllowed, 403);

        $gudangUsers = User::whereHas('jobPosition', fn ($q) => $q->whereIn('name', Position::GUDANG_LINE_POSITIONS))
            ->with('jobPosition:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'position' => $u->jobPosition->name,
            ]);

        $selectedUserId = $request->input('user_id');
        $selectedPosition = $request->input('position');
        $targetUser = null;

        if ($selectedUserId && $gudangUsers->firstWhere('id', (int) $selectedUserId)) {
            $targetUser = User::find($selectedUserId);
        } elseif ($selectedPosition && in_array($selectedPosition, Position::GUDANG_POSITIONS)) {
            $firstOfPosition = $gudangUsers->firstWhere('position', $selectedPosition);
            $targetUser = $firstOfPosition ? User::find($firstOfPosition['id']) : null;
        } elseif ($gudangUsers->isNotEmpty()) {
            $targetUser = User::find($gudangUsers->first()['id']);
        }

        $dateScore = null;
        $dateTasks = collect();
        $weeklyScores = collect();
        $monthlyScore = null;

        if ($targetUser) {
            $dailyScore = KpiDailyScore::where('user_id', $targetUser->id)
                ->where('score_date', $selectedDate)
                ->first();

            $dateScore = $dailyScore ? [
                'score_date' => $dailyScore->score_date,
                'total_score' => (float) $dailyScore->total_score,
                'completed_weight' => (float) $dailyScore->completed_weight,
                'total_weight' => (float) $dailyScore->total_weight,
                'total_tasks' => $dailyScore->total_tasks,
                'completed_tasks' => $dailyScore->completed_tasks,
                'verified_tasks' => $dailyScore->verified_tasks,
                'grade' => $dailyScore->grade,
                'category_breakdown' => $dailyScore->category_breakdown,
            ] : null;

            $dateTasks = Task::where('is_kpi_task', true)
                ->where('creator_id', $targetUser->id)
                ->whereDate('created_at', $selectedDate)
                ->with(['kpiDefinition', 'comments.user', 'comments.media', 'creator:id,name,email', 'team:id,name'])
                ->orderBy('order_position')
                ->get()
                ->map(fn ($task) => [
                    'id' => $task->id,
                    'title' => $task->title,
                    'category' => $task->kpiDefinition?->category,
                    'task_name' => $task->kpiDefinition?->task_name ?? $task->title,
                    'weight' => $task->kpiDefinition?->weight,
                    'description' => $task->description,
                    'is_done' => $task->is_verified,
                    'is_verified' => $task->is_verified,
                    'is_kpi_task' => $task->is_kpi_task,
                    'comment_count' => $task->comments->count(),
                    'has_media' => $task->comments->some(fn ($c) => $c->hasMedia()),
                    'comments' => $task->comments->map(fn ($comment) => [
                        'id' => $comment->id,
                        'content' => $comment->content,
                        'created_at' => $comment->created_at->toDateTimeString(),
                        'user' => [
                            'id' => $comment->user?->id,
                            'name' => $comment->user?->name,
                            'email' => $comment->user?->email,
                        ],
                        'media' => $comment->getMedia('documents')->map(fn ($media) => [
                            'id' => $media->id,
                            'name' => $media->file_name,
                            'original_url' => $media->getUrl(),
                            'mime_type' => $media->mime_type,
                        ]),
                    ]),
                ]);

            $weeklyScores = KpiWeeklyScore::where('user_id', $targetUser->id)
                ->latest('week_start_date')
                ->take(4)
                ->get()
                ->map(fn ($score) => [
                    'week_start_date' => $score->week_start_date,
                    'week_end_date' => $score->week_end_date,
                    'average_score' => (float) $score->average_score,
                    'grade' => $score->grade,
                ]);

            $monthly = KpiMonthlyScore::where('user_id', $targetUser->id)
                ->whereMonth('month', now())
                ->first();

            if ($monthly) {
                $monthlyScore = [
                    'month' => $monthly->month,
                    'average_score' => (float) $monthly->average_score,
                    'consistency_bonus' => (float) $monthly->consistency_bonus,
                    'final_score' => (float) $monthly->final_score,
                    'grade' => $monthly->grade,
                    'has_grade_d' => (bool) $monthly->has_grade_d,
                ];
            }
        }

        return Inertia::render('gudang/kpi/dashboard', [
            'selectedDate' => $selectedDate,
            'dateScore' => $dateScore,
            'dateTasks' => $dateTasks,
            'weeklyScores' => $weeklyScores,
            'monthlyScore' => $monthlyScore,
            'categoryBreakdown' => $dateScore['category_breakdown'] ?? [],
            'hasTasksForDate' => $dateTasks->isNotEmpty(),
            'canGenerateForDate' => false,
            'canGenerateTasks' => false,
            'gudangUsers' => $gudangUsers,
            'selectedUserId' => $targetUser?->id,
            'viewingAs' => $targetUser ? [
                'name' => $targetUser->name,
                'position' => $targetUser->jobPosition?->name,
            ] : null,
        ]);
    }

    public function daily(?string $date = null): Response
    {
        $user = auth()->user();
        $scoreDate = $date ? Carbon::parse($date) : now();

        $dailyScore = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $scoreDate->toDateString())
            ->first();

        $score = $dailyScore ? [
            'score_date' => $dailyScore->score_date,
            'total_score' => (float) $dailyScore->total_score,
            'completed_weight' => (float) $dailyScore->completed_weight,
            'total_weight' => (float) $dailyScore->total_weight,
            'total_tasks' => $dailyScore->total_tasks,
            'completed_tasks' => $dailyScore->completed_tasks,
            'verified_tasks' => $dailyScore->verified_tasks,
            'grade' => $dailyScore->grade,
            'category_breakdown' => $dailyScore->category_breakdown,
            'task_details' => $dailyScore->task_details,
        ] : null;

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/daily-detail", [
            'score' => $score,
            'date' => $scoreDate->toDateString(),
        ]);
    }

    public function weekly(?string $weekStart = null): Response
    {
        $user = auth()->user();
        $week = $weekStart ? Carbon::parse($weekStart) : now();
        $weekStartDate = $week->copy()->startOfWeek(Carbon::MONDAY);

        $weeklyScore = KpiWeeklyScore::where('user_id', $user->id)
            ->where('week_start_date', $weekStartDate->toDateString())
            ->first();

        $score = $weeklyScore ? [
            'week_start_date' => $weeklyScore->week_start_date,
            'week_end_date' => $weeklyScore->week_end_date,
            'average_score' => (float) $weeklyScore->average_score,
            'grade' => $weeklyScore->grade,
            'daily_scores' => collect($weeklyScore->daily_scores)->map(fn ($day) => [
                'date' => $day['date'],
                'score' => (float) $day['score'],
                'grade' => $day['grade'],
            ])->toArray(),
            'category_breakdown' => $weeklyScore->category_breakdown,
        ] : null;

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/weekly-detail", [
            'score' => $score,
            'weekStart' => $weekStartDate->toDateString(),
        ]);
    }

    public function monthly(?string $month = null): Response
    {
        $user = auth()->user();
        $monthDate = $month ? Carbon::parse($month) : now();
        $monthStart = $monthDate->copy()->startOfMonth();

        $monthlyScore = KpiMonthlyScore::where('user_id', $user->id)
            ->where('month', $monthStart->toDateString())
            ->first();

        $score = $monthlyScore ? [
            'month' => $monthlyScore->month,
            'average_score' => (float) $monthlyScore->average_score,
            'consistency_bonus' => (float) $monthlyScore->consistency_bonus,
            'final_score' => (float) $monthlyScore->final_score,
            'grade' => $monthlyScore->grade,
            'has_grade_d' => (bool) $monthlyScore->has_grade_d,
            'weekly_scores' => collect($monthlyScore->weekly_scores)->map(fn ($week) => [
                'week_start' => $week['week_start'],
                'week_end' => $week['week_end'],
                'score' => (float) $week['score'],
                'grade' => $week['grade'],
            ])->toArray(),
            'category_breakdown' => $monthlyScore->category_breakdown,
        ] : null;

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/monthly-detail", [
            'score' => $score,
            'month' => $monthStart->toDateString(),
        ]);
    }

    public function verifyTask(Request $request, Task $task)
    {
        $user = auth()->user();

        if (! $task->assignees()->where('users.id', $user->id)->exists()) {
            abort(403, 'Task tidak ditugaskan kepada Anda');
        }

        $evidenceStatus = $this->scoringService->verifyTaskEvidence($task);

        // Only mark as verified if there's full evidence (comment + attachment)
        if ($evidenceStatus === 'full') {
            $task->update([
                'is_verified' => true,
                'verified_at' => now(),
            ]);
        }

        // Calculate scores regardless of evidence status (partial gets 30%, none gets 0%)
        $taskDate = $task->created_at;

        // Calculate daily score
        try {
            $this->scoringService->calculateDailyScore($user, $taskDate);
        } catch (\Exception $e) {
            report($e);
        }

        // Calculate weekly score if there are daily scores
        $weekStart = $taskDate->copy()->startOfWeek(Carbon::MONDAY);
        try {
            $this->scoringService->calculateWeeklyScore($user, $weekStart);
        } catch (\Exception $e) {
            // Weekly score calculation might fail if not enough daily scores
        }

        // Calculate monthly score if there are weekly scores
        try {
            $this->scoringService->calculateMonthlyScore($user, $taskDate);
        } catch (\Exception $e) {
            // Monthly score calculation might fail if not enough weekly scores
        }

        return back()->with('success', 'Task berhasil diverifikasi');
    }

    public function generateTasks(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;
        $isManager = in_array($positionName, ['Manager HR', 'Manager Operasional'])
            || in_array($positionName, Position::GUDANG_POSITIONS);

        $team = $user->teams()->where('is_spv_team', true)->first();

        // Only require team for non-managers
        if (! $team && ! $isManager) {
            return back()->withErrors(['error' => 'Anda tidak terdaftar dalam tim SPV']);
        }

        $targetDate = $request->input('date')
            ? Carbon::parse($request->input('date'))
            : now();

        // Prevent generating for future dates
        if ($targetDate->isFuture()) {
            return back()->withErrors(['error' => 'Tidak dapat generate task untuk hari esok']);
        }

        // Check if tasks already exist for the date
        $existingTasksQuery = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $targetDate->toDateString());

        if ($team) {
            $existingTasksQuery->where('team_id', $team->id);
        }

        if ($existingTasksQuery->exists()) {
            return back()->withErrors(['error' => 'Task untuk tanggal ini sudah dibuat']);
        }

        // Generate tasks (team can be null for managers)
        $this->taskGenerationService->generateDailyTasksForUser($user, $targetDate, $team);

        return back()->with('success', 'Task KPI berhasil dibuat');
    }
}
