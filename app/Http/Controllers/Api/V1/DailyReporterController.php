<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AgentDailyReportRequest;
use App\Http\Resources\Api\DailyReporterResource;
use App\Models\KpiDailyReport;
use App\Models\Store;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class DailyReporterController extends Controller
{
    public function __construct(protected KpiReportingService $reportingService) {}

    /**
     * Public daily-report feed for every position that is required to submit a
     * daily report (any position with a configured report-field template — not
     * just managers). Returns submitted reports plus the reporters still
     * pending for the requested date (defaults to yesterday).
     */
    public function index(AgentDailyReportRequest $request): JsonResponse
    {
        $date = $request->reportDate();

        $reports = KpiDailyReport::with('user.jobPosition')
            ->where('report_date', $date)
            ->whereHas('user.jobPosition.reportFields')
            ->latest('submitted_at')
            ->get();

        $submittedUserIds = $reports->pluck('user_id')->all();

        $pendingReporters = User::with('jobPosition')
            ->whereHas('jobPosition.reportFields')
            ->whereNotIn('id', $submittedUserIds)
            ->get();

        // For SPV reporters, the store they monitored that day lives on their KPI
        // task (visit_date = report_date). Load it once for every reporter so the
        // resource can expose it without an N+1 lookup per row.
        $allUserIds = array_merge(
            $submittedUserIds,
            $pendingReporters->pluck('id')->all(),
        );
        $storesByUserId = $this->storesForDate($allUserIds, $date);

        $reports->each(function (KpiDailyReport $report) use ($storesByUserId): void {
            $report->store = $storesByUserId->get($report->user_id);
        });

        $fieldTemplateCache = [];

        $reports->each(function (KpiDailyReport $report) use (&$fieldTemplateCache): void {
            $positionName = $report->user?->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            $report->report_fields = $positionName
                ? ($fieldTemplateCache[$positionName] ?? [])
                : [];
        });

        $pending = $pendingReporters->map(function (User $user) use (&$fieldTemplateCache, $storesByUserId): array {
            $positionName = $user->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            $store = $storesByUserId->get($user->id);

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'job_position' => $positionName
                        ? ['name' => $positionName, 'area_slug' => $user->jobPosition?->area_slug]
                        : null,
                ],
                'store' => $store ? [
                    'id' => $store->id,
                    'name' => $store->name,
                    'branch_code' => $store->branch_code,
                ] : null,
                'report_fields' => $positionName
                    ? ($fieldTemplateCache[$positionName] ?? [])
                    : [],
            ];
        });

        return response()->json([
            'date' => $date,
            'reports' => DailyReporterResource::collection($reports),
            'pending' => $pending->values(),
        ]);
    }

    /**
     * Map each reporter to the store they monitored on the given date, taken from
     * their KPI task carrying a store visit (visit_date = report date). Keyed by
     * user id; users without a store visit are simply absent from the map.
     *
     * @param  array<int, int>  $userIds
     * @return Collection<int, Store>
     */
    protected function storesForDate(array $userIds, string $date): Collection
    {
        if ($userIds === []) {
            return collect();
        }

        return Task::query()
            ->whereIn('creator_id', $userIds)
            ->where('is_kpi_task', true)
            ->whereDate('visit_date', $date)
            ->whereNotNull('store_id')
            ->with('store:id,name,branch_code')
            ->get()
            ->keyBy('creator_id')
            ->map(fn (Task $task) => $task->store)
            ->filter();
    }
}
