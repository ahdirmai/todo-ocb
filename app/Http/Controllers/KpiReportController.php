<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Models\User;
use App\Services\KpiReportingService;
use App\Support\Kpi\ValidAreasResolver;
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
        $segment = explode('/', request()->path())[0] ?? '';
        $urlArea = ValidAreasResolver::isValid($segment) ? $segment : null;

        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            return $urlArea ?? 'operational';
        }

        $position = $user->jobPosition;

        if (! $position?->has_kpi || ! $position->area_slug) {
            abort(403, 'Posisi Anda tidak memiliki akses KPI');
        }

        return $position->area_slug;
    }

    protected function canSubmitReports(User $user): bool
    {
        return (bool) $user->jobPosition?->hasReportTemplate();
    }

    /**
     * Resolve a KPI route for an area. Legacy areas (hr/gudang/operational)
     * keep their explicit `{area}.kpi.*` route names; any other valid area
     * falls back to the generic `kpi.area.*` group with the {area} param.
     */
    protected function kpiRoute(string $area, string $suffix): string
    {
        if (in_array($area, ['hr', 'gudang', 'operational'], true)) {
            return route("{$area}.kpi.{$suffix}");
        }

        return route("kpi.area.{$suffix}", ['area' => $area]);
    }

    public function create(Request $request)
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;

        if (! $this->canSubmitReports($user)) {
            $area = $this->getPositionArea();

            return redirect()->to($this->kpiRoute($area, 'reports'))
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
        if (! $this->canSubmitReports($user)) {
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
        if (! $this->canSubmitReports($user)) {
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

        return redirect()->to($this->kpiRoute($area, 'reports'))->with('success', 'Laporan berhasil diperbarui');
    }

    public function submit(Request $request): RedirectResponse
    {
        $user = auth()->user();

        $positionName = $user->jobPosition?->name;
        if (! $this->canSubmitReports($user)) {
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

        return redirect()->to($this->kpiRoute($area, 'dashboard'))->with('success', $message);
    }

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;
        $area = $this->getPositionArea();

        $isAdmin = $user->hasAnyRole(['admin', 'superadmin']);

        // Admin/superadmin may VIEW report lists even without submit rights.
        if (! $this->canSubmitReports($user) && ! $isAdmin) {
            return redirect()->to($this->kpiRoute($area, 'dashboard'));
        }

        $reports = KpiDailyReport::where('user_id', $user->id)
            ->with('user:id,name')
            ->with('user.jobPosition:id,name')
            ->latest('report_date')
            ->paginate(20);

        $reportFields = $this->reportingService->getReportFieldsTemplate($positionName);

        return Inertia::render("{$area}/kpi/reports", [
            'reports' => $reports,
            'canCreate' => true,
            'reportFields' => $reportFields,
        ]);
    }
}
