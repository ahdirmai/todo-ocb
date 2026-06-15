<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AgentDailyReportRequest;
use App\Http\Resources\Api\AgentDailyReportResource;
use App\Models\KpiDailyReport;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiReportingService;
use Illuminate\Http\JsonResponse;

class AgentDailyReportController extends Controller
{
    public function __construct(protected KpiReportingService $reportingService) {}

    public function dailyReports(AgentDailyReportRequest $request): JsonResponse
    {
        $date = $request->reportDate();

        $managerPositions = ['Manager HR', 'Manager Operasional', 'Manager Gudang'];

        $reports = KpiDailyReport::with('user.jobPosition')
            ->where('report_date', $date)
            ->whereHas('user.jobPosition', fn ($q) => $q->whereIn('name', $managerPositions))
            ->latest('submitted_at')
            ->get();

        $submittedUserIds = $reports->pluck('user_id')->toArray();

        $pendingManagers = User::with('jobPosition')
            ->whereHas('jobPosition', fn ($q) => $q->whereIn('name', $managerPositions))
            ->whereNotIn('id', $submittedUserIds)
            ->get();

        $fieldTemplateCache = [];

        $reports->each(function (KpiDailyReport $report) use (&$fieldTemplateCache, $date): void {
            $positionName = $report->user?->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            $report->report_fields = $positionName
                ? ($fieldTemplateCache[$positionName] ?? [])
                : [];

            $report->tasks = $this->loadManagerTasks($report->user_id, $date);
        });

        $pending = $pendingManagers->map(function (User $user) use (&$fieldTemplateCache): array {
            $positionName = $user->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'job_position' => $positionName ? ['name' => $positionName] : null,
                ],
                'report_fields' => $positionName
                    ? ($fieldTemplateCache[$positionName] ?? [])
                    : [],
            ];
        });

        return response()->json([
            'date' => $date,
            'reports' => AgentDailyReportResource::collection($reports),
            'pending' => $pending,
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadManagerTasks(int $userId, string $date): array
    {
        $tasks = Task::where('is_kpi_task', true)
            ->where('creator_id', $userId)
            ->whereDate('created_at', $date)
            ->with([
                'kpiDefinition',
                'comments' => fn ($q) => $q->with(['user', 'media'])->orderBy('created_at'),
            ])
            ->orderBy('order_position')
            ->get();

        return $tasks->map(fn (Task $task) => [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'category' => $task->kpiDefinition?->category,
            'task_name' => $task->kpiDefinition?->task_name ?? $task->title,
            'weight' => $task->kpiDefinition?->weight,
            'is_verified' => $task->is_verified,
            'is_done' => $task->is_verified,
            'is_kpi_task' => $task->is_kpi_task,
            'comment_count' => $task->comments->count(),
            'has_media' => $task->comments->contains(fn ($c) => $c->media->isNotEmpty()),
            'comments' => $task->comments->map(fn ($c) => [
                'id' => $c->id,
                'content' => $c->content,
                'created_at' => $c->created_at->toISOString(),
                'parent_id' => $c->parent_id,
                'user' => $c->user ? [
                    'id' => $c->user->id,
                    'name' => $c->user->name,
                ] : null,
                'media' => $c->media->map(fn ($m) => [
                    'id' => $m->id,
                    'file_name' => $m->file_name,
                    'mime_type' => $m->mime_type,
                    'original_url' => $m->getUrl(),
                ]),
            ]),
        ])->toArray();
    }
}
