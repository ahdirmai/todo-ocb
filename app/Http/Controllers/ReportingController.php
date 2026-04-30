<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonthlyTaskReportRequest;
use App\Http\Resources\Api\MonthlyTaskReportResource;
use App\Models\MonthlyTaskReport;
use App\Services\MonthlyTaskReportingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function show(MonthlyTaskReport $monthlyTaskReport, Request $request): Response
    {
        $monthlyTaskReport->load(['team', 'generator']);

        $canEdit = $request->user()?->hasRole(['superadmin', 'admin']) ?? false;

        return Inertia::render('reporting/show', [
            'report' => MonthlyTaskReportResource::make($monthlyTaskReport)->resolve(),
            'canEdit' => $canEdit,
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

    public function update(MonthlyTaskReport $monthlyTaskReport, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'teams' => ['required', 'array'],
            'teams.*.members' => ['required', 'array'],
            'teams.*.members.*.breakdown_task' => ['required', 'array'],
            'teams.*.members.*.breakdown_task.*.breakdown_jalur' => ['required', 'array'],
            'teams.*.members.*.breakdown_task.*.breakdown_jalur.*.skor' => ['required', 'integer', 'min:0'],
            'teams.*.members.*.breakdown_task.*.admin_note' => ['nullable', 'string', 'max:500'],
            'teams.*.members.*.breakdown_task.*.quality' => ['nullable', 'string', 'max:100'],
        ]);

        $payload = $monthlyTaskReport->payload;

        foreach ($validated['teams'] as $teamIndex => $teamData) {
            foreach ($teamData['members'] as $memberIndex => $memberData) {
                foreach ($memberData['breakdown_task'] as $taskIndex => $taskData) {
                    $payloadPath = "teams.{$teamIndex}.members.{$memberIndex}.breakdown_task.{$taskIndex}";
                    $existingTask = data_get($payload, $payloadPath);

                    if ($existingTask === null) {
                        continue;
                    }

                    foreach ($taskData['breakdown_jalur'] as $jalurIndex => $jalurData) {
                        $jalurPath = "{$payloadPath}.breakdown_jalur.{$jalurIndex}";
                        $existingJalur = data_get($payload, $jalurPath);

                        if ($existingJalur === null) {
                            continue;
                        }

                        $maxScore = (int) ($existingJalur['score_sangat_baik'] ?? $existingJalur['skor_maksimal'] ?? 10);
                        $newScore = min((int) $jalurData['skor'], $maxScore);

                        data_set($payload, "{$jalurPath}.skor", $newScore);
                        data_set($payload, "{$jalurPath}.edited", true);

                        $scoreKurang = (int) ($existingJalur['score_kurang'] ?? 3);
                        $scoreCukup = (int) ($existingJalur['score_cukup'] ?? 6);

                        if ($newScore === 0) {
                            $level = 'none';
                        } elseif ($newScore <= $scoreKurang) {
                            $level = 'kurang';
                        } elseif ($newScore <= $scoreCukup) {
                            $level = 'cukup';
                        } else {
                            $level = 'sangat_baik';
                        }
                        data_set($payload, "{$jalurPath}.level", $level);
                    }

                    $breakdownJalur = data_get($payload, "{$payloadPath}.breakdown_jalur", []);
                    $totalTask = collect($breakdownJalur)->sum('skor');
                    $maxTask = collect($breakdownJalur)->sum(fn (array $j) => (int) ($j['score_sangat_baik'] ?? $j['skor_maksimal'] ?? 10));
                    $complianceTask = $maxTask > 0 ? number_format(($totalTask / $maxTask) * 100, 1) : '0.0';

                    data_set($payload, "{$payloadPath}.skor_total_task", $totalTask);
                    data_set($payload, "{$payloadPath}.skor_maksimal_task", $maxTask);
                    data_set($payload, "{$payloadPath}.compliance_persen", $complianceTask);

                    if (isset($taskData['admin_note'])) {
                        data_set($payload, "{$payloadPath}.admin_note", $taskData['admin_note']);
                    }

                    if (! empty($taskData['quality'])) {
                        data_set($payload, "{$payloadPath}.quality", $taskData['quality']);
                    }
                }

                $memberPath = "teams.{$teamIndex}.members.{$memberIndex}";
                $tasks = data_get($payload, "{$memberPath}.breakdown_task", []);
                $totalScore = collect($tasks)->sum('skor_total_task');
                $totalMax = collect($tasks)->sum('skor_maksimal_task');
                $overallCompliance = $totalMax > 0 ? number_format(($totalScore / $totalMax) * 100, 1) : '0.0';

                data_set($payload, "{$memberPath}.total_score", $totalScore);
                data_set($payload, "{$memberPath}.skor_maksimal", $totalMax);
                data_set($payload, "{$memberPath}.compliance_persen", $overallCompliance);

                $perfValue = (float) $overallCompliance;
                $perfLabel = match (true) {
                    $perfValue > 80.0 => 'excellent',
                    $perfValue > 60.0 => 'good',
                    $perfValue > 40.0 => 'watch',
                    default => 'critical',
                };
                data_set($payload, "{$memberPath}.performance_label", $perfLabel);
            }
        }

        $month = $monthlyTaskReport->report_month?->toImmutable();

        $monthlyTaskReport->update([
            'payload' => $payload,
            'recap_per_user' => $reportingService->generateRecapFromPayload($payload, $month),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Report berhasil diupdate.',
        ]);

        return redirect()->route('reporting.show', $monthlyTaskReport);
    }

    public function regenerate(MonthlyTaskReport $monthlyTaskReport, MonthlyTaskReportingService $reportingService, Request $request): RedirectResponse
    {
        $teamId = $monthlyTaskReport->team_id;
        $month = $monthlyTaskReport->report_month;

        $monthlyTaskReport->delete();

        $report = $reportingService->getOrGenerate(
            $month->toImmutable(),
            $teamId,
            $request->user(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Report berhasil digenerate ulang.',
        ]);

        return redirect()->route('reporting.show', $report);
    }
}
