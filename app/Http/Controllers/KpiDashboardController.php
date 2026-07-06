<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyScore;
use App\Models\KpiMonthlyScore;
use App\Models\KpiWeeklyScore;
use App\Models\Position;
use App\Models\Store;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiScoringService;
use App\Services\KpiTaskGenerationService;
use App\Support\Kpi\ValidAreasResolver;
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
        $urlArea = $this->extractAreaFromPath(request()->path());

        // Admin/superadmin can access any valid area based on URL
        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            return $urlArea ?? 'operational';
        }

        // Regular users: validate position
        $position = $user->jobPosition;

        if (! $position?->has_kpi || ! $position->area_slug) {
            abort(403, 'Posisi Anda tidak memiliki akses KPI');
        }

        $expectedArea = $position->area_slug;

        // Validate URL area matches user position
        if ($urlArea && $urlArea !== $expectedArea) {
            abort(403, 'Akses ditolak. Posisi Anda: '.$position->name);
        }

        return $expectedArea;
    }

    /**
     * Resolve the KPI area from the first URL segment when it is a valid
     * KPI area. Works for both legacy prefixes (hr/gudang/operational) and
     * generic `{area}/kpi` routes without a hardcoded list.
     */
    private function extractAreaFromPath(string $path): ?string
    {
        $segment = explode('/', $path)[0] ?? '';

        return ValidAreasResolver::isValid($segment) ? $segment : null;
    }

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $selectedDate = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        $isManager = (bool) $user->jobPosition?->is_manager;
        $isGudang = $user->jobPosition?->area_slug === 'gudang';
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

        // Manager's / gudang position's own KPI tasks. Admin viewers and
        // SPV-team-less managers have no $team, so scope by creator only.
        $dateTasksQuery = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $selectedDate)
            ->with(['kpiDefinition', 'comments.user', 'comments.media', 'creator:id,name,email', 'team:id,name'])
            ->orderBy('order_position');

        if (! $isManager && ! $isGudang && $team) {
            $dateTasksQuery->where('team_id', $team->id);
        }

        $dateTasks = $dateTasksQuery->get();

        $dateTasks = $dateTasks->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'category' => $task->kpiDefinition?->category,
                'task_name' => $task->kpiDefinition?->task_name ?? $task->title,
                'weight' => $task->kpiDefinition?->weight,
                'can_upload_proof' => (bool) $task->kpiDefinition?->can_upload_proof,
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
                        'can_upload_proof' => (bool) $task->kpiDefinition?->can_upload_proof,
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
        $canGenerateForDate = Carbon::parse($selectedDate)->isToday();

        // Manager HR/Ops, gudang positions, and any KPI-enabled position
        // (e.g. SPV Unit 1 with has_kpi=true but is_manager=false) can
        // generate their own daily tasks from KpiTaskDefinition templates.
        $canGenerateTasks = $isManager || $isGudang || ((bool) $user->jobPosition?->has_kpi);

        // Only real area members submit reports. Admin/superadmin viewers see
        // the dashboard read-only (no submit button) — they monitor, not submit.
        $canSubmitReport = ! $isAdmin && (bool) $user->jobPosition?->hasReportTemplate();

        // SPV users need their assigned stores for the store-selection modal
        $spvStores = [];
        if ($area === 'spv') {
            $spvStores = Store::where('spv_id', $user->id)
                ->orderBy('branch_code')
                ->get(['id', 'name', 'branch_code'])
                ->map(fn ($store) => [
                    'id' => $store->id,
                    'name' => $store->name,
                    'branch_code' => $store->branch_code,
                ])
                ->values();
        }

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
            'canSubmitReport' => $canSubmitReport,
            'isManager' => $isManager,
            'spvStores' => $spvStores,
        ]);
    }

    public function gudangMonitoring(Request $request, ?string $selectedDate = null): Response
    {
        $selectedDate = $selectedDate ?: now()->toDateString();
        $viewer = auth()->user();
        $isAllowed = $viewer->hasAnyRole(['admin', 'superadmin'])
            || ($viewer->jobPosition?->area_slug === 'gudang' && $viewer->jobPosition?->is_manager);
        abort_unless($isAllowed, 403);

        $gudangUsers = User::whereHas('jobPosition', fn ($q) => $q->where('area_slug', 'gudang')->where('is_manager', false))
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
        } elseif ($selectedPosition && Position::where('area_slug', 'gudang')->where('name', $selectedPosition)->exists()) {
            // Check line positions list first, then fall back to direct DB lookup
            // (Manager Gudang is in gudang area but not in $gudangUsers dropdown which only has line staff)
            $firstOfPosition = $gudangUsers->firstWhere('position', $selectedPosition);
            if ($firstOfPosition) {
                $targetUser = User::find($firstOfPosition['id']);
            } else {
                $targetUser = User::whereHas('jobPosition', fn ($q) => $q->where('name', $selectedPosition))
                    ->first();
            }
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
                    'can_upload_proof' => (bool) $task->kpiDefinition?->can_upload_proof,
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

    /**
     * SPV supervisor's KPI dashboard — Phase 9 fix.
     *
     * Renders a read-only overview of the SPV team's store-visit tasks
     * for the selected date. SPV users don't generate their own KPI tasks
     * (they supervise a team that does), so this view focuses on team
     * context: who is in the team, what visits are scheduled, completion
     * progress, and store-by-store aggregates.
     *
     * Does NOT call getPositionArea() because SPV's `area_slug='spv'` is
     * not in the HR/Gudang/Operational switch — the controller would
     * otherwise abort 403 for SPV users.
     */
    public function spvDashboard(Request $request): Response
    {
        $user = auth()->user();
        $selectedDate = $request->input('date')
            ? Carbon::parse($request->input('date'))->toDateString()
            : now()->toDateString();

        // SPV user must be in an SPV team.
        $team = $user->teams()->where('is_spv_team', true)->first();

        if (! $team) {
            return Inertia::render('spv/kpi/no-team', [
                'message' => 'Anda belum terdaftar dalam tim SPV. Hubungi admin untuk assignment.',
            ]);
        }

        $teamMembers = User::whereHas('teams', fn ($q) => $q->where('teams.id', $team->id))
            ->with('jobPosition:id,name,area_slug')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'position_id']);

        // Only the SPV team's kanban tasks scheduled for the date
        // (matches the existing KpiDashboardController::index() filter pattern
        // which scopes by team_id — keeps SPV view focused on team workflow
        // and prevents leaking ad-hoc tasks a member created in OTHER teams).
        $todayTasks = Task::query()
            ->with([
                'creator:id,name,email',
                'assignees:id,name,email',
                'store:id,name,branch_code',
                'column:id,name',
                'comments.user',
                'comments.media',
            ])
            ->where('team_id', $team->id)
            ->whereDate('visit_date', $selectedDate)
            ->orderBy('order_position')
            ->get();

        // Aggregate counts (kanban + ad-hoc)
        $stats = [
            'total' => $todayTasks->count(),
            'verified' => $todayTasks->where('is_verified', true)->count(),
            'completed' => $todayTasks->where('is_done', true)->count(),
            'store_visits' => $todayTasks->whereNotNull('store_id')->count(),
        ];

        return Inertia::render('spv/kpi/dashboard', [
            'selectedDate' => $selectedDate,
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'memberCount' => $teamMembers->count(),
            ],
            'teamMembers' => $teamMembers->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'position' => $u->jobPosition?->name,
            ]),
            'todayTasks' => $todayTasks->map(function (Task $task) {
                $rawVisitDate = $task->getRawOriginal('visit_date');
                $rawDueDate = $task->getRawOriginal('due_date');

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'visit_date' => $rawVisitDate ? (is_string($rawVisitDate) ? substr($rawVisitDate, 0, 10) : $rawVisitDate) : null,
                    'due_date' => $rawDueDate ? (is_string($rawDueDate) ? substr($rawDueDate, 0, 10) : $rawDueDate) : null,
                    'is_done' => (bool) $task->is_done,
                    'is_verified' => (bool) $task->is_verified,
                    'order_position' => $task->order_position,
                    'column_id' => $task->column_id,
                    'kanban_id' => $task->kanban_id,
                    'creator' => [
                        'id' => $task->creator?->id,
                        'name' => $task->creator?->name,
                        'email' => $task->creator?->email,
                    ],
                    'assignees' => $task->assignees->map(fn ($a) => [
                        'id' => $a->id,
                        'name' => $a->name,
                        'email' => $a->email,
                    ]),
                    'store' => $task->store ? [
                        'id' => $task->store->id,
                        'name' => $task->store->name,
                        'branch_code' => $task->store->branch_code,
                    ] : null,
                    'column' => [
                        'id' => $task->column?->id,
                        'name' => $task->column?->name,
                    ],
                    'comment_count' => $task->comments->count(),
                    'has_media' => $task->comments->some(fn ($c) => $c->hasMedia()),
                ];
            }),
            'stats' => $stats,
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
        $positionName = $user->jobPosition?->name;

        // Only task creator or assigned user can verify
        $isCreator = $task->creator_id === $user->id;
        $isAssigned = $task->assignees()->where('users.id', $user->id)->exists();

        if (! $isCreator && ! $isAssigned) {
            abort(403, 'Anda tidak berhak memverifikasi task ini');
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
        $isManager = (bool) $user->jobPosition?->is_manager;
        $requiresSpv = (bool) $user->jobPosition?->requires_spv_team;
        $isSpv = $user->jobPosition?->area_slug === 'spv';

        $team = $requiresSpv
            ? $user->teams()->where('is_spv_team', true)->first()
            : null;

        // Only require team for positions that have requires_spv_team=true and aren't managers.
        // Managers and kpi-area line staff (e.g. Gudang line) bypass the SPV-team requirement.
        if (! $team && ! $isManager && $requiresSpv) {
            return back()->withErrors(['error' => 'Anda tidak terdaftar dalam tim SPV']);
        }

        $targetDate = $request->input('date')
            ? Carbon::parse($request->input('date'))
            : now();

        // Prevent generating for non-today dates
        if (! $targetDate->isToday()) {
            return back()->withErrors(['error' => 'Generate task hanya bisa untuk hari ini']);
        }

        // SPV users must select a store before generating tasks
        $storeId = null;
        if ($isSpv) {
            $storeId = $request->integer('store_id');

            if (! $storeId) {
                return back()->withErrors(['error' => 'Pilih toko terlebih dahulu sebelum generate task']);
            }

            $store = Store::where('id', $storeId)->where('spv_id', $user->id)->first();

            if (! $store) {
                return back()->withErrors(['error' => 'Toko tidak valid atau tidak ditugaskan ke Anda']);
            }
        }

        // Check if tasks already exist for the date (and store, if SPV)
        $existingTasksQuery = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $targetDate->toDateString());

        if ($team) {
            $existingTasksQuery->where('team_id', $team->id);
        }

        if ($storeId) {
            $existingTasksQuery->where('store_id', $storeId);
        }

        if ($existingTasksQuery->exists()) {
            $errorMsg = $storeId
                ? 'Task untuk toko ini pada tanggal ini sudah dibuat'
                : 'Task untuk tanggal ini sudah dibuat';

            return back()->withErrors(['error' => $errorMsg]);
        }

        // Generate tasks (team can be null for managers)
        $this->taskGenerationService->generateDailyTasksForUser($user, $targetDate, $team, $storeId);

        return back()->with('success', 'Task KPI berhasil dibuat');
    }
}
