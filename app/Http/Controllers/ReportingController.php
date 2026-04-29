<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonthlyTaskReportRequest;
use App\Http\Resources\Api\MonthlyTaskReportResource;
use App\Models\MonthlyTaskReport;
use App\Services\MonthlyTaskReportingService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportingController extends Controller
{
    public function index(MonthlyTaskReportingService $reportingService): Response
    {
        $teamOptions = $reportingService->teamOptions();

        $reports = MonthlyTaskReport::query()
            ->select(['id', 'report_month', 'platform', 'team_id', 'generated_by', 'model', 'source_task_count', 'generated_at', 'created_at'])
            ->with(['team:id,name', 'generator:id,name'])
            ->latest()
            ->paginate(15);

        return Inertia::render('reporting/index', [
            'teamOptions' => $teamOptions,
            'reports' => [
                'data' => $reports->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'month' => $r->report_month?->format('Y-m'),
                        'platform' => $r->platform,
                        'team' => $r->team ? ['name' => $r->team->name] : null,
                        'generator' => $r->generator ? ['name' => $r->generator->name] : null,
                        'model' => $r->model,
                        'source_task_count' => $r->source_task_count,
                        'generated_at' => $r->generated_at?->format('Y-m-d H:i:s') ?? $r->created_at->format('Y-m-d H:i:s'),
                    ];
                }),
                'links' => $reports->linkCollection()->toArray(),
            ],
        ]);
    }

    public function show(MonthlyTaskReport $monthlyTaskReport): Response
    {
        $monthlyTaskReport->load(['team', 'generator']);

        return Inertia::render('reporting/show', [
            'report' => MonthlyTaskReportResource::make($monthlyTaskReport)->resolve(),
        ]);
    }

    public function generate(MonthlyTaskReportRequest $request, MonthlyTaskReportingService $reportingService): RedirectResponse
    {
        $teamId = $request->teamId();

        if ($teamId === null) {
            return redirect()
                ->route('reporting.index', [
                    'month' => $request->month()->format('Y-m'),
                ])
                ->withErrors([
                    'team_id' => 'Pilih team yang memiliki SOP terlebih dahulu.',
                ]);
        }

        $report = $reportingService->getOrGenerate(
            $request->month(),
            $teamId,
            $request->user(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Report berhasil digenerate.',
        ]);

        return redirect()->route('reporting.show', $report);
    }
}
