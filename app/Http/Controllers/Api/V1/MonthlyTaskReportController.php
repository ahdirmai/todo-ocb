<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\InternalMonthlyTaskReportRequest;
use App\Http\Requests\MonthlyTaskReportRequest;
use App\Http\Resources\Api\MonthlyTaskReportListResource;
use App\Http\Resources\Api\MonthlyTaskReportRecapPerUserResource;
use App\Http\Resources\Api\MonthlyTaskReportResource;
use App\Services\MonthlyTaskReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MonthlyTaskReportController extends Controller
{
    public function internalIndex(InternalMonthlyTaskReportRequest $request, MonthlyTaskReportingService $reportingService): AnonymousResourceCollection
    {
        return $this->index($request, $reportingService);
    }

    public function internalRecapPerUser(InternalMonthlyTaskReportRequest $request, MonthlyTaskReportingService $reportingService): JsonResponse
    {
        $month = $request->month();
        $teamId = $request->teamId();

        if ($teamId !== null) {
            $report = $reportingService->findByMonth($month, $teamId);

            return response()->json([
                'data' => $report
                    ? MonthlyTaskReportRecapPerUserResource::make($report)->resolve()
                    : $this->emptyRecapResponse($month->format('Y-m'), $month->toDateString()),
            ]);
        }

        // No team_id: return recap for ALL teams for the requested month
        $reports = $reportingService->findAllByMonth($month);

        $allRecap = $reports->flatMap(fn ($report) => collect($report->recap_per_user ?? []))->values()->all();

        return response()->json([
            'data' => [
                'month' => $month->format('Y-m'),
                'report_month' => $month->toDateString(),
                'team' => null,
                'generated_at' => $reports->isNotEmpty() ? $reports->max('generated_at')?->toDateTimeString() : null,
                'source_task_count' => $reports->sum('source_task_count'),
                'recap_per_user' => $allRecap,
            ],
        ]);
    }

    private function emptyRecapResponse(string $month, string $reportMonth): array
    {
        return [
            'id' => null,
            'month' => $month,
            'report_month' => $reportMonth,
            'platform' => null,
            'team' => null,
            'generated_at' => null,
            'source_task_count' => 0,
            'recap_per_user' => [],
        ];
    }

    public function index(Request $request, MonthlyTaskReportingService $reportingService): AnonymousResourceCollection
    {
        $request->validate([
            'team_id' => ['nullable', 'string', 'uuid'],
            'year' => ['nullable', 'integer', 'min:2020', 'max:2099'],
        ]);

        $paginator = $reportingService->listReports(
            teamId: $request->input('team_id'),
            year: $request->integer('year') ?: null,
        );

        return MonthlyTaskReportListResource::collection($paginator);
    }

    public function show(MonthlyTaskReportRequest $request, MonthlyTaskReportingService $reportingService): MonthlyTaskReportResource
    {
        $teamId = $request->teamId();

        if ($teamId === null) {
            throw new NotFoundHttpException('Parameter report belum lengkap.');
        }

        $report = $reportingService->findByMonth($request->month(), $teamId);

        if ($report === null) {
            throw new NotFoundHttpException('Report bulanan belum pernah digenerate.');
        }

        return MonthlyTaskReportResource::make($report);
    }

    public function recapPerUser(MonthlyTaskReportRequest $request, MonthlyTaskReportingService $reportingService): MonthlyTaskReportRecapPerUserResource
    {
        $teamId = $request->teamId();

        if ($teamId === null) {
            throw new NotFoundHttpException('Parameter report belum lengkap.');
        }

        $report = $reportingService->findByMonth($request->month(), $teamId);

        if ($report === null) {
            throw new NotFoundHttpException('Report bulanan belum pernah digenerate.');
        }

        return MonthlyTaskReportRecapPerUserResource::make($report);
    }
}
