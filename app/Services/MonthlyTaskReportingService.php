<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentSopStep;
use App\Models\KanbanColumn;
use App\Models\MonthlyTaskReport;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MonthlyTaskReportingService
{
    public function __construct(
        public TaskColumnScoringService $scoringService,
    ) {}

    /**
     * @return LengthAwarePaginator<MonthlyTaskReport>
     */
    public function listReports(?string $teamId = null, ?int $year = null): LengthAwarePaginator
    {
        return MonthlyTaskReport::query()
            ->with(['generator:id,name,email', 'team:id,name,slug'])
            ->when($teamId, fn ($q) => $q->where('team_id', $teamId))
            ->when($year, fn ($q) => $q->whereYear('report_month', $year))
            ->orderByDesc('report_month')
            ->orderBy('team_id')
            ->paginate(20);
    }

    /**
     * @return EloquentCollection<int, MonthlyTaskReport>
     */
    public function findAllByMonth(CarbonImmutable $month): EloquentCollection
    {
        return MonthlyTaskReport::query()
            ->with(['team:id,name,slug'])
            ->whereDate('report_month', $month->toDateString())
            ->get();
    }

    public function latestReportMonth(): ?CarbonImmutable
    {
        $latest = MonthlyTaskReport::query()->max('report_month');

        return $latest ? CarbonImmutable::parse($latest)->startOfMonth() : null;
    }

    public function findByMonth(CarbonImmutable $month, string $teamId): ?MonthlyTaskReport
    {
        return MonthlyTaskReport::query()
            ->with(['generator', 'team'])
            ->whereDate('report_month', $month->toDateString())
            ->where('team_id', $teamId)
            ->first();
    }

    public function getOrGenerate(CarbonImmutable $month, string $teamId, ?User $generatedBy = null): MonthlyTaskReport
    {
        $existingReport = $this->findByMonth($month, $teamId);

        if ($existingReport !== null) {
            return $existingReport;
        }

        $team = $this->resolveTeamWithSop($teamId);
        $sourceSnapshot = $this->buildSourceSnapshot($month, $team);
        $payload = $this->buildPayload($sourceSnapshot);

        try {
            return MonthlyTaskReport::query()->create([
                'report_month' => $month->toDateString(),
                'platform' => 'word-match',
                'team_id' => $team->id,
                'generated_by' => $generatedBy?->id,
                'model' => 'word-match-v1',
                'prompt_version' => 'v1',
                'source_task_count' => data_get($sourceSnapshot, 'overall.task_count', 0),
                'payload' => $payload,
                'recap_per_user' => $this->generateRecapFromPayload($payload, $month),
                'source_snapshot' => $sourceSnapshot,
                'generated_at' => now(),
            ])->load(['generator', 'team']);
        } catch (QueryException $e) {
            Log::error('MonthlyTaskReport insert failed', [
                'message' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
            ]);

            return $this->findByMonth($month, $teamId) ?? throw new \RuntimeException('Gagal menyimpan report bulanan: '.$e->getMessage());
        }
    }

    /**
     * Build recap_per_user array from payload.
     * Includes work_days, target_score, and kpi_status per member.
     */
    public function generateRecapFromPayload(array $payload, ?CarbonImmutable $month = null): array
    {
        $recap = [];
        $teams = $payload['teams'] ?? [];

        // Calculate work days: total days in month minus number of Sundays
        $workDays = $this->calculateWorkDays($month);

        foreach ($teams as $team) {
            // Derive max_score_per_task from the sum of score_sangat_baik across
            // all breakdown_jalur of the first available task (same SOP = same max per task)
            $maxScorePerTask = $this->resolveMaxScorePerTask($team);

            foreach ($team['members'] as $member) {
                $jumlahTask = (int) ($member['jumlah_task'] ?? 0);
                $skorMaksimal = (int) ($member['skor_maksimal'] ?? 0);
                $totalScore = (int) ($member['total_score'] ?? 0);

                // target = (sum of all SOP step max scores) × work_days
                $targetScore = (int) round($maxScorePerTask * $workDays);

                $targetCompliance = $targetScore > 0
                    ? number_format(($totalScore / $targetScore) * 100, 1)
                    : '0.0';

                $kpiStatus = (float) $targetCompliance >= 80.0 ? 'memenuhi' : 'tidak_memenuhi';

                $recap[] = [
                    'team_name' => $team['team_name'] ?? '',
                    'member_key' => $member['member_key'] ?? '',
                    'name' => $member['name'] ?? '',
                    'position' => $member['position'] ?? '',
                    'jumlah_task' => $jumlahTask,
                    'total_score' => $totalScore,
                    'skor_maksimal' => $skorMaksimal,
                    'compliance_persen' => $member['compliance_persen'] ?? '0.0',
                    'performance_label' => $member['performance_label'] ?? 'none',
                    'work_days' => $workDays,
                    'max_score_per_task' => $maxScorePerTask,
                    'target_score' => $targetScore,
                    'target_compliance' => $targetCompliance,
                    'kpi_status' => $kpiStatus,
                ];
            }
        }

        return $recap;
    }

    /**
     * Resolve the max score for a single task by summing score_sangat_baik
     * (or skor_maksimal as fallback) from all breakdown_jalur of the first task.
     * This is the same for all tasks in a team since they share the same SOP.
     */
    private function resolveMaxScorePerTask(array $team): int
    {
        foreach ($team['members'] as $member) {
            foreach ($member['breakdown_task'] ?? [] as $task) {
                $jalurList = $task['breakdown_jalur'] ?? [];
                if (count($jalurList) === 0) {
                    continue;
                }

                return (int) collect($jalurList)->sum(
                    fn (array $j): int => (int) ($j['score_sangat_baik'] ?? $j['skor_maksimal'] ?? 10)
                );
            }
        }

        return 0;
    }

    /**
     * Calculate working days for a month (total days minus Sundays).
     */
    private function calculateWorkDays(?CarbonImmutable $month): int
    {
        if ($month === null) {
            $month = CarbonImmutable::now()->startOfMonth();
        }

        $start = $month->startOfMonth();
        $end = $month->endOfMonth();
        $daysInMonth = $end->day;

        // Count Sundays in the month
        $sundays = 0;
        $current = $start;
        while ($current->lte($end)) {
            if ($current->isSunday()) {
                $sundays++;
            }
            $current = $current->addDay();
        }

        return max(1, $daysInMonth - $sundays);
    }

    public function teamOptions(): array
    {
        return Team::query()
            ->where('is_active', true)
            ->whereHas('documents', fn ($query) => $query->where('is_sop', true))
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Team $team): array => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
            ])
            ->values()
            ->all();
    }

    private function buildPayload(array $sourceSnapshot): array
    {
        if ((int) data_get($sourceSnapshot, 'overall.task_count', 0) === 0) {
            return [
                'month' => $sourceSnapshot['month'],
                'platform' => 'word-match',
                'period' => $sourceSnapshot['period'],
                'overview' => [
                    'headline' => 'Belum ada aktivitas task pada periode ini.',
                    'summary' => 'Tidak ditemukan task baru pada bulan yang dipilih.',
                    'metrics' => $sourceSnapshot['overall'],
                ],
                'teams' => [],
            ];
        }

        return [
            'month' => $sourceSnapshot['month'],
            'platform' => 'sop-step-scoring',
            'period' => $sourceSnapshot['period'],
            'overview' => [
                'headline' => 'Laporan scoring task bulanan.',
                'summary' => 'Scoring dilakukan berdasarkan SOP steps dan word-matching komentar task.',
                'metrics' => $sourceSnapshot['overall'],
            ],
            'teams' => collect($sourceSnapshot['teams'])
                ->map(function (array $team): array {
                    $kanbanColumns = $team['kanban_columns'] ?? [];
                    $sopSteps = $this->loadSopStepsForTeam($team['team_id']);
                    $auditStepCount = count($sopSteps) > 0 ? count($sopSteps) : count($kanbanColumns);

                    $members = collect($team['members'])
                        ->map(function (array $member) use ($kanbanColumns, $sopSteps): array {
                            $breakdownTask = collect($member['tasks'])
                                ->map(function (array $task) use ($kanbanColumns, $sopSteps): array {
                                    $scoring = $this->scoringService->scoreTask($task, $kanbanColumns, $sopSteps);

                                    return [
                                        'task_id' => $task['id'],
                                        'nama_task' => $task['title'],
                                        'kolom_saat_ini' => $task['status'],
                                        'is_done' => $task['is_done'],
                                        'due_date' => $task['due_date'],
                                        'total_komentar' => $task['comments_count'],
                                        'total_attachment' => $task['attachment_count'],
                                        'skor_total_task' => $scoring['skor_total_task'],
                                        'skor_maksimal_task' => $scoring['skor_maksimal_task'],
                                        'compliance_persen' => $scoring['compliance_persen'],
                                        'quality' => $scoring['quality'],
                                        'breakdown_jalur' => $scoring['breakdown_jalur'],
                                    ];
                                })
                                ->values()
                                ->all();

                            $totalScore = collect($breakdownTask)->sum('skor_total_task');
                            $totalMax = collect($breakdownTask)->sum('skor_maksimal_task');
                            $overallCompliance = $totalMax > 0
                                ? number_format(($totalScore / $totalMax) * 100, 1)
                                : '0.0';

                            return [
                                'member_key' => $member['member_key'],
                                'user_id' => $member['user_id'],
                                'name' => $member['name'],
                                'position' => $member['position'],
                                'jumlah_task' => count($breakdownTask),
                                'total_score' => $totalScore,
                                'skor_maksimal' => $totalMax,
                                'compliance_persen' => $overallCompliance,
                                'performance_label' => $this->scoringService->determinePerformanceLabel($overallCompliance),
                                'breakdown_task' => $breakdownTask,
                            ];
                        })
                        ->values()
                        ->all();

                    return [
                        'team_id' => $team['team_id'],
                        'team_name' => $team['team_name'],
                        'team_slug' => $team['team_slug'],
                        'audit_step_count' => $auditStepCount,
                        'summary' => $team['summary'],
                        'members' => $members,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<int, array{name: string, expected_column: ?string, score_kurang: int, score_cukup: int, score_sangat_baik: int, min_comment: int, min_media: int, is_mandatory: bool}>
     */
    private function loadSopStepsForTeam(string $teamId): array
    {
        $sopDocument = Document::query()
            ->where('team_id', $teamId)
            ->where('is_sop', true)
            ->latest()
            ->first();

        if ($sopDocument === null) {
            return [];
        }

        return DocumentSopStep::query()
            ->where('document_id', $sopDocument->id)
            ->orderBy('sequence_order')
            ->get()
            ->map(fn (DocumentSopStep $step): array => [
                'name' => $step->name,
                'expected_column' => $step->expected_column,
                'score_kurang' => $step->score_kurang,
                'score_cukup' => $step->score_cukup,
                'score_sangat_baik' => $step->score_sangat_baik,
                'min_comment' => $step->min_comment,
                'min_media' => $step->min_media,
                'is_mandatory' => $step->is_mandatory,
            ])
            ->all();
    }

    private function buildSourceSnapshot(CarbonImmutable $month, Team $team): array
    {
        $periodStart = $month->startOfMonth()->startOfDay();
        $periodEnd = $month->endOfMonth()->endOfDay();

        /** @var EloquentCollection<int, Task> $tasks */
        $tasks = Task::query()
            ->whereBelongsTo($team)
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->with([
                'team:id,name,slug',
                'creator:id,name,position',
                'kanbanColumn:id,title,is_done',
                'assignees:id,name,position',
                'comments' => fn ($query) => $query
                    ->whereNull('parent_id')
                    ->with('user:id,name')
                    ->withCount('media')
                    ->latest(),
            ])
            ->withCount(['comments', 'media'])
            ->orderBy('created_at')
            ->get();

        $teams = collect([
            $this->buildTeamSnapshot($team, $tasks, $periodEnd),
        ])->filter(fn (?array $snapshot): bool => $snapshot !== null)->values();

        $memberCount = $teams
            ->flatMap(fn (array $team): array => array_map(fn (array $member): string => $member['member_key'], $team['members']))
            ->unique()
            ->count();

        return [
            'month' => $month->format('Y-m'),
            'period' => [
                'start' => $periodStart->toDateString(),
                'end' => $periodEnd->toDateString(),
            ],
            'overall' => [
                'task_count' => $tasks->count(),
                'completed_count' => $tasks->filter(fn (Task $task): bool => (bool) $task->kanbanColumn?->is_done)->count(),
                'overdue_count' => $tasks->filter(fn (Task $task): bool => $this->isOverdue($task, $periodEnd))->count(),
                'team_count' => $teams->count(),
                'member_count' => $memberCount,
            ],
            'teams' => $teams->all(),
        ];
    }

    private function buildTeamSnapshot(Team $team, Collection $teamTasks, CarbonImmutable $periodEnd): ?array
    {
        $kanbanColumns = $this->buildTeamKanbanColumns($team->id);

        if ($teamTasks->isEmpty()) {
            return [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'team_slug' => $team->slug,
                'kanban_columns' => $kanbanColumns,
                'summary' => [
                    'task_count' => 0,
                    'completed_count' => 0,
                    'open_count' => 0,
                    'overdue_count' => 0,
                    'member_count' => 0,
                ],
                'members' => [],
            ];
        }

        $members = [];

        foreach ($teamTasks as $task) {
            $owners = $task->assignees->isNotEmpty()
                ? $task->assignees
                : collect([$task->creator])->filter();

            foreach ($owners as $owner) {
                $memberKey = 'user:'.$owner->id;

                if (! isset($members[$memberKey])) {
                    $members[$memberKey] = [
                        'member_key' => $memberKey,
                        'user_id' => $owner->id,
                        'name' => $owner->name,
                        'position' => $owner->position,
                        'summary' => [
                            'task_count' => 0,
                            'completed_count' => 0,
                            'open_count' => 0,
                            'overdue_count' => 0,
                            'comment_count' => 0,
                            'attachment_count' => 0,
                        ],
                        'tasks' => [],
                    ];
                }

                $taskAttachmentCount = (int) ($task->media_count ?? 0)
                    + $task->comments->sum(fn ($comment): int => (int) ($comment->media_count ?? 0));

                $taskSummary = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $task->kanbanColumn?->title,
                    'is_done' => (bool) $task->kanbanColumn?->is_done,
                    'due_date' => $task->due_date?->toDateString(),
                    'created_at' => $task->created_at?->toDateString(),
                    'comments_count' => (int) ($task->comments_count ?? 0),
                    'attachment_count' => $taskAttachmentCount,
                    'comments' => $task->comments->map(fn ($comment): array => [
                        'author' => $comment->user?->name,
                        'content' => (string) $comment->content,
                        'attachments_count' => (int) ($comment->media_count ?? 0),
                    ])->values()->all(),
                ];

                $members[$memberKey]['summary']['task_count']++;
                $members[$memberKey]['summary']['comment_count'] += (int) ($task->comments_count ?? 0);
                $members[$memberKey]['summary']['attachment_count'] += $taskAttachmentCount;

                if ($taskSummary['is_done']) {
                    $members[$memberKey]['summary']['completed_count']++;
                } else {
                    $members[$memberKey]['summary']['open_count']++;
                }

                if ($this->isOverdue($task, $periodEnd)) {
                    $members[$memberKey]['summary']['overdue_count']++;
                }

                $members[$memberKey]['tasks'][] = $taskSummary;
            }
        }

        $memberCollection = collect($members)
            ->map(function (array $member): array {
                $member['tasks'] = collect($member['tasks'])
                    ->sortBy([
                        ['is_done', 'asc'],
                        ['due_date', 'asc'],
                        ['created_at', 'asc'],
                    ])
                    ->values()
                    ->all();

                return $member;
            })
            ->sortByDesc(fn (array $member): int => $member['summary']['task_count'])
            ->values();

        return [
            'team_id' => $team->id,
            'team_name' => $team->name,
            'team_slug' => $team->slug,
            'kanban_columns' => $kanbanColumns,
            'summary' => [
                'task_count' => $teamTasks->count(),
                'completed_count' => $teamTasks->filter(fn (Task $task): bool => (bool) $task->kanbanColumn?->is_done)->count(),
                'open_count' => $teamTasks->filter(fn (Task $task): bool => ! (bool) $task->kanbanColumn?->is_done)->count(),
                'overdue_count' => $teamTasks->filter(fn (Task $task): bool => $this->isOverdue($task, $periodEnd))->count(),
                'member_count' => $memberCollection->count(),
            ],
            'members' => $memberCollection->all(),
        ];
    }

    private function isOverdue(Task $task, CarbonImmutable $periodEnd): bool
    {
        if ($task->due_date === null || (bool) $task->kanbanColumn?->is_done) {
            return false;
        }

        return $task->due_date->lt($periodEnd);
    }

    private function buildTeamKanbanColumns(?string $teamId): array
    {
        if ($teamId === null) {
            return [];
        }

        return KanbanColumn::query()
            ->whereHas('kanban', fn ($query) => $query->where('team_id', $teamId))
            ->orderBy('order')
            ->get(['id', 'kanban_id', 'title', 'order', 'is_done'])
            ->map(fn (KanbanColumn $column): array => [
                'id' => $column->id,
                'kanban_id' => $column->kanban_id,
                'title' => $column->title,
                'order' => $column->order,
                'is_done' => (bool) $column->is_done,
            ])
            ->values()
            ->all();
    }

    private function resolveTeamWithSop(string $teamId): Team
    {
        return Team::query()
            ->whereKey($teamId)
            ->whereHas('documents', fn ($query) => $query->where('is_sop', true))
            ->firstOr(fn () => throw new \RuntimeException('Team tidak memiliki SOP sehingga report tidak bisa digenerate.'));
    }
}
