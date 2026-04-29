<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MonthlyTaskReportRequest;
use App\Http\Resources\Api\MonthlyTaskReportResource;
use App\Services\MonthlyTaskReportingService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MonthlyTaskReportController extends Controller
{
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
}
