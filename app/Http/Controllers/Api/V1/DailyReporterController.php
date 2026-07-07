<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AgentDailyReportRequest;
use App\Http\Resources\Api\DailyReporterResource;
use App\Models\KpiDailyReport;
use App\Models\User;
use App\Services\KpiReportingService;
use Illuminate\Http\JsonResponse;

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

        $pending = $pendingReporters->map(function (User $user) use (&$fieldTemplateCache): array {
            $positionName = $user->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'job_position' => $positionName
                        ? ['name' => $positionName, 'area_slug' => $user->jobPosition?->area_slug]
                        : null,
                ],
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
}
