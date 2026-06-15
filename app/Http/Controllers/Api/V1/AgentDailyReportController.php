<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AgentDailyReportRequest;
use App\Http\Resources\Api\AgentDailyReportResource;
use App\Models\KpiDailyReport;
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

        $reports->each(function (KpiDailyReport $report) use (&$fieldTemplateCache): void {
            $positionName = $report->user?->jobPosition?->name;

            if ($positionName && ! array_key_exists($positionName, $fieldTemplateCache)) {
                $fieldTemplateCache[$positionName] = $this->reportingService->getReportFieldsTemplate($positionName);
            }

            $report->report_fields = $positionName
                ? ($fieldTemplateCache[$positionName] ?? [])
                : [];
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
}
