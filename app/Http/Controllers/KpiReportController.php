<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Models\Position;
use App\Services\KpiReportingService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiReportController extends Controller
{
    public function __construct(protected KpiReportingService $reportingService) {}

    protected function getPositionArea(): string
    {
        $user = auth()->user();
        $path = request()->path();

        // Detect area from URL path first
        if (str_starts_with($path, 'hr/')) {
            return 'hr';
        }
        if (str_starts_with($path, 'operational/')) {
            return 'operational';
        }
        if (str_starts_with($path, 'gudang/')) {
            return 'gudang';
        }

        // Fallback: detect from position name
        $positionName = $user->jobPosition?->name;

        return match (true) {
            $positionName === 'Manager HR' => 'hr',
            $positionName === 'Manager Operasional' => 'operational',
            in_array($positionName, Position::GUDANG_POSITIONS) => 'gudang',
            default => throw new \Exception('Position tidak memiliki akses KPI'),
        };
    }

    protected function canSubmitReports(string $positionName): bool
    {
        return in_array($positionName, ['Manager HR', 'Manager Operasional'])
            || $positionName === 'Manager Gudang';
    }

    public function create(Request $request)
    {
        $user = auth()->user();

        // Block admins/superadmins from creating reports - redirect to list
        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($positionName)) {
            $area = $this->getPositionArea();

            return redirect()->route("{$area}.kpi.reports")
                ->with('error', 'Anda tidak memiliki akses untuk membuat laporan');
        }

        $selectedDate = $request->query('date')
            ? Carbon::createFromFormat('Y-m-d', $request->query('date'))->startOfDay()
            : now()->startOfDay();

        $template = $this->reportingService->getDailyReportTemplate($user, $selectedDate);

        $existingReport = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $selectedDate->toDateString())
            ->first();

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/report-form", [
            'template' => $template,
            'existingReport' => $existingReport,
            'canSubmit' => true,
            'selectedDate' => $selectedDate->toDateString(),
        ]);
    }

    public function edit(KpiDailyReport $report): Response
    {
        $user = auth()->user();

        if ($report->user_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke laporan ini');
        }

        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($positionName)) {
            abort(403, 'Anda tidak memiliki akses untuk mengedit laporan');
        }

        $template = $this->reportingService->getDailyReportTemplate($user, $report->report_date);
        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/report-form", [
            'template' => $template,
            'existingReport' => $report,
            'canSubmit' => true,
            'isEditing' => true,
            'reportId' => $report->id,
        ]);
    }

    public function update(Request $request, KpiDailyReport $report): RedirectResponse
    {
        $user = auth()->user();

        if ($report->user_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke laporan ini');
        }

        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($positionName)) {
            abort(403, 'Anda tidak memiliki akses untuk mengedit laporan');
        }

        $area = $this->getPositionArea();

        if ($area === 'operational') {
            $validated = $request->validate([
                'status_34_tasks' => 'required|string',
                'spv_status' => 'nullable|string',
                'issues_today' => 'nullable|string',
                'follow_up' => 'nullable|string',
                'action_plan' => 'nullable|string',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        } elseif ($area === 'gudang') {
            $validated = $request->validate([
                'recap' => 'required|string|max:3000',
                'action_plan' => 'required|string|max:2000',
                'attachments' => 'nullable|array|max:5',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        } else {
            $validated = $request->validate([
                'report_data' => 'required|array',
                'report_data.absensi' => 'required|array',
                'report_data.disiplin' => 'required|array',
                'report_data.performance_sales' => 'required|array',
                'report_data.compliance' => 'required|array',
                'report_data.training' => 'required|array',
                'report_data.recruitment' => 'required|array',
                'action_plan' => 'nullable|string',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        }

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '22:30';

        $report->update(array_merge(
            collect($validated)->except('attachments')->toArray(),
            [
                'submitted_at' => $submittedAt,
                'is_late' => $isLate,
            ]
        ));

        $routeName = "{$area}.kpi.reports";

        return redirect()->route($routeName)->with('success', 'Laporan berhasil diperbarui');
    }

    public function submit(Request $request): RedirectResponse
    {
        $user = auth()->user();

        // Manager HR, Manager Operasional, and Manager Gudang can submit reports
        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($positionName)) {
            abort(403, 'Anda tidak memiliki akses untuk mengisi laporan');
        }

        $area = $this->getPositionArea();

        // Position-specific validation
        if ($area === 'operational') {
            $validated = $request->validate([
                'status_34_tasks' => 'required|string',
                'spv_status' => 'nullable|string',
                'issues_today' => 'nullable|string',
                'follow_up' => 'nullable|string',
                'action_plan' => 'nullable|string',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        } elseif ($area === 'gudang') {
            $validated = $request->validate([
                'recap' => 'required|string|max:3000',
                'action_plan' => 'required|string|max:2000',
                'attachments' => 'nullable|array|max:5',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        } else {
            // HR validation
            $validated = $request->validate([
                'report_data' => 'required|array',
                'report_data.absensi' => 'required|array',
                'report_data.disiplin' => 'required|array',
                'report_data.performance_sales' => 'required|array',
                'report_data.compliance' => 'required|array',
                'report_data.training' => 'required|array',
                'report_data.recruitment' => 'required|array',
                'action_plan' => 'nullable|string',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
        }

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '22:30';

        $reportDate = $request->input('report_date', now()->toDateString());

        $this->reportingService->createDailyReport($user, array_merge($validated, [
            'report_date' => $reportDate,
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
        ]));

        $message = $isLate
            ? 'Laporan berhasil dikirim (TERLAMBAT - lewat 22:30 WITA)'
            : 'Laporan berhasil dikirim ke CEO';

        $routeName = "{$area}.kpi.dashboard";

        return redirect()->route($routeName)->with('success', $message);
    }

    public function index(): Response
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;

        // Managers see only their own reports; admins see all for their area
        if (in_array($positionName, ['Manager HR', 'Manager Operasional', 'Manager Gudang'])) {
            $reports = KpiDailyReport::where('user_id', $user->id)
                ->latest('report_date')
                ->paginate(20);
        } else {
            // Admins/superadmins see all reports for their area
            $reports = KpiDailyReport::latest('report_date')
                ->paginate(20);
        }

        $area = $this->getPositionArea();
        $canCreate = in_array($positionName, ['Manager HR', 'Manager Operasional', 'Manager Gudang']);

        return Inertia::render("{$area}/kpi/reports", [
            'reports' => $reports,
            'canCreate' => $canCreate,
        ]);
    }
}
