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

        if (str_starts_with($path, 'hr/')) {
            return 'hr';
        }
        if (str_starts_with($path, 'operational/')) {
            return 'operational';
        }
        if (str_starts_with($path, 'gudang/')) {
            return 'gudang';
        }

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
        $reportFields = $this->reportingService->getReportFieldsTemplate($positionName);

        $existingReport = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $selectedDate->toDateString())
            ->first();

        $canSubmit = ! $existingReport;

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/report-form", [
            'template' => $template,
            'reportFields' => $reportFields,
            'existingReport' => $existingReport,
            'canSubmit' => $canSubmit,
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
        $reportFields = $this->reportingService->getReportFieldsTemplate($positionName);

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/report-form", [
            'template' => $template,
            'reportFields' => $reportFields,
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

        $templateFields = $this->reportingService->getReportFieldsTemplate($positionName);
        $rules = $this->reportingService->buildValidationRules($templateFields);
        $validated = $request->validate($rules);

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '22:30';

        $report->update([
            'fields' => $validated['fields'] ?? [],
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
        ]);

        $area = $this->getPositionArea();

        return redirect()->route("{$area}.kpi.reports")->with('success', 'Laporan berhasil diperbarui');
    }

    public function submit(Request $request): RedirectResponse
    {
        $user = auth()->user();

        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($positionName)) {
            abort(403, 'Anda tidak memiliki akses untuk mengisi laporan');
        }

        $templateFields = $this->reportingService->getReportFieldsTemplate($positionName);
        $rules = $this->reportingService->buildValidationRules($templateFields);
        $validated = $request->validate($rules);

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '22:30';

        $reportDate = $request->input('report_date', now()->toDateString());

        $alreadySubmitted = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $reportDate)
            ->exists();

        if ($alreadySubmitted) {
            return back()->withErrors([
                'report_date' => 'Laporan untuk tanggal ini sudah pernah dikirim. Gunakan tombol Edit di riwayat laporan.',
            ]);
        }

        $this->reportingService->createDailyReport($user, array_merge($validated['fields'] ?? [], [
            'report_date' => $reportDate,
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
            'attachments' => $validated['attachments'] ?? null,
        ]));

        $message = $isLate
            ? 'Laporan berhasil dikirim (TERLAMBAT - lewat 22:30 WITA)'
            : 'Laporan berhasil dikirim ke CEO';

        $area = $this->getPositionArea();

        return redirect()->route("{$area}.kpi.dashboard")->with('success', $message);
    }

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;
        $area = $this->getPositionArea();

        if (in_array($positionName, ['Manager HR', 'Manager Operasional', 'Manager Gudang'])) {
            $reports = KpiDailyReport::where('user_id', $user->id)
                ->with('user:id,name')
                ->with('user.jobPosition:id,name')
                ->latest('report_date')
                ->paginate(20);
        } else {
            $query = KpiDailyReport::with('user:id,name')
                ->with('user.jobPosition:id,name');

            if ($area === 'gudang') {
                $query->whereHas('user.jobPosition', fn ($q) => $q->whereIn('name', Position::GUDANG_POSITIONS));
            } elseif ($area === 'operational') {
                $query->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Operasional'));
            } elseif ($area === 'hr') {
                $query->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager HR'));
            }

            if ($request->has('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            $reports = $query->latest('report_date')
                ->paginate(20);
        }

        $canCreate = in_array($positionName, ['Manager HR', 'Manager Operasional', 'Manager Gudang']);

        // Get report fields template for viewing
        $viewPositionName = $positionName;
        if (! $canCreate) {
            // Admin viewing: resolve from area
            $viewPositionName = match ($area) {
                'hr' => 'Manager HR',
                'operational' => 'Manager Operasional',
                'gudang' => 'Manager Gudang',
                default => $positionName,
            };
        }
        $reportFields = $this->reportingService->getReportFieldsTemplate($viewPositionName);

        return Inertia::render("{$area}/kpi/reports", [
            'reports' => $reports,
            'canCreate' => $canCreate,
            'reportFields' => $reportFields,
        ]);
    }
}
