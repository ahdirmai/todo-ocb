<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Services\KpiReportingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiReportController extends Controller
{
    public function __construct(protected KpiReportingService $reportingService) {}

    public function create(): Response
    {
        $user = auth()->user();
        $today = now();

        $template = $this->reportingService->getDailyReportTemplate($user, $today);

        $existingReport = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $today->toDateString())
            ->first();

        return Inertia::render('kpi/report-form', [
            'template' => $template,
            'existingReport' => $existingReport,
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'status_34_tasks' => 'required|string',
            'spv_status' => 'nullable|string',
            'issues_today' => 'nullable|string',
            'follow_up' => 'nullable|string',
            'action_plan' => 'nullable|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '22:30';

        $this->reportingService->createDailyReport(auth()->user(), array_merge($validated, [
            'report_date' => now()->toDateString(),
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
        ]));

        $message = $isLate
            ? 'Laporan berhasil dikirim (TERLAMBAT - lewat 22:30 WITA)'
            : 'Laporan berhasil dikirim ke CEO';

        return redirect()->route('kpi.dashboard')->with('success', $message);
    }

    public function index(): Response
    {
        $user = auth()->user();

        $reports = KpiDailyReport::where('user_id', $user->id)
            ->latest('report_date')
            ->paginate(20);

        return Inertia::render('kpi/reports', [
            'reports' => $reports,
        ]);
    }
}
