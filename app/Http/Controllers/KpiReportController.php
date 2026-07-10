<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Models\Position;
use App\Models\Task;
use App\Models\User;
use App\Services\KpiReportingService;
use App\Services\KpiScoringService;
use App\Support\Kpi\ValidAreasResolver;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiReportController extends Controller
{
    public function __construct(
        protected KpiReportingService $reportingService,
        protected KpiScoringService $scoringService,
    ) {}

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
     * When enabled (via KPI_ALLOW_BACKDATED_REPORT), reports may be submitted
     * and edited for past dates, not just the current day.
     */
    protected function allowBackdatedReport(): bool
    {
        return (bool) config('services.kpi.allow_backdated_report', false);
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

        // Only today's report can be submitted, and only before the 23:30 WITA
        // cutoff. Past dates are read-only: show the stored report if one exists,
        // otherwise leave it empty. When backdated reporting is enabled, past
        // dates are submittable too (cutoff only applies to today).
        $allowBackdated = $this->allowBackdatedReport();
        $pastCutoff = ! $allowBackdated && now()->format('H:i') > '23:30';
        $dateAllowed = $allowBackdated
            ? ! $selectedDate->isFuture()
            : $selectedDate->isToday();
        $canSubmit = ! $existingReport && $dateAllowed && ! $pastCutoff;

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/report-form", [
            'template' => $template,
            'reportFields' => $reportFields,
            'existingReport' => $existingReport,
            'canSubmit' => $canSubmit,
            'selectedDate' => $selectedDate->toDateString(),
            'isToday' => $selectedDate->isToday(),
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

        // Only today's report is editable. Past reports are read-only unless
        // backdated reporting is enabled.
        if (! $this->allowBackdatedReport() && ! $report->report_date->isToday()) {
            abort(403, 'Laporan hari sebelumnya tidak dapat diubah (read-only).');
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
            'isToday' => true,
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

        // Only today's report is editable. Past reports are read-only unless
        // backdated reporting is enabled.
        if (! $this->allowBackdatedReport() && ! $report->report_date->isToday()) {
            abort(403, 'Laporan hari sebelumnya tidak dapat diubah (read-only).');
        }

        $templateFields = $this->reportingService->getReportFieldsTemplate($positionName);
        $rules = $this->reportingService->buildValidationRules($templateFields);
        $validated = $request->validate($rules);

        $submittedAt = now();
        $isLate = $submittedAt->format('H:i') > '23:30';

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

        $submittedAt = now();
        $allowBackdated = $this->allowBackdatedReport();

        // Hard cutoff: reports cannot be submitted after 23:30 WITA. Skipped
        // when backdated reporting is enabled.
        if (! $allowBackdated && $submittedAt->format('H:i') > '23:30') {
            return back()->withErrors([
                'report_date' => 'Batas pengiriman laporan pukul 23:30 WITA telah lewat.',
            ]);
        }

        $templateFields = $this->reportingService->getReportFieldsTemplate($positionName);
        $rules = $this->reportingService->buildValidationRules($templateFields);
        $validated = $request->validate($rules);

        $isLate = $submittedAt->format('H:i') > '23:30';

        $reportDate = $request->input('report_date', now()->toDateString());

        // Reports may only be submitted for the current day. When backdated
        // reporting is enabled, past dates are allowed too (future dates are
        // always rejected).
        $isForbiddenDate = $allowBackdated
            ? $reportDate > now()->toDateString()
            : $reportDate !== now()->toDateString();

        if ($isForbiddenDate) {
            return back()->withErrors([
                'report_date' => $allowBackdated
                    ? 'Laporan tidak dapat dikirim untuk tanggal yang akan datang.'
                    : 'Laporan hanya dapat dikirim untuk hari ini.',
            ]);
        }

        $alreadySubmitted = KpiDailyReport::where('user_id', $user->id)
            ->where('report_date', $reportDate)
            ->exists();

        if ($alreadySubmitted) {
            return back()->withErrors([
                'report_date' => 'Laporan untuk tanggal ini sudah pernah dikirim. Gunakan tombol Edit di riwayat laporan.',
            ]);
        }

        // Report unlocks only after the day's KPI tasks reach 80% (by weight).
        // KPI-enabled positions must generate their daily tasks first: with no
        // tasks there is nothing to reach 80% on, so the report stays locked.
        // Positions without KPI tasks have nothing to measure and may submit.
        if ((bool) $user->jobPosition?->has_kpi) {
            if (! $this->reportingService->hasKpiTasksForDate($user, $reportDate)) {
                return back()->withErrors([
                    'report_date' => 'Laporan baru bisa dikirim setelah task hari ini di-generate dan mencapai 80%.',
                ]);
            }

            $progress = $this->reportingService->getWeightedTaskProgress($user, $reportDate);
            if ($progress < 80.0) {
                return back()->withErrors([
                    'report_date' => "Laporan baru bisa dikirim setelah task hari ini mencapai 80% (sekarang {$progress}%).",
                ]);
            }
        }

        $this->reportingService->createDailyReport($user, array_merge($validated['fields'] ?? [], [
            'report_date' => $reportDate,
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
            'attachments' => $validated['attachments'] ?? null,
        ]));

        // Tasks flagged auto_done_on_report are completed by the act of
        // submitting the report. Mark them, then recompute scores so the newly
        // verified weight is reflected. Only on initial submit — never on edit.
        $marked = $this->reportingService->markAutoDoneTasks($user, $reportDate);
        if ($marked > 0) {
            $reportDateCarbon = Carbon::parse($reportDate);

            try {
                $this->scoringService->calculateDailyScore($user, $reportDateCarbon);
                $this->scoringService->calculateWeeklyScore($user, $reportDateCarbon->copy()->startOfWeek(Carbon::MONDAY));
                $this->scoringService->calculateMonthlyScore($user, $reportDateCarbon);
            } catch (\Exception $e) {
                report($e);
            }
        }

        $message = $isLate
            ? 'Laporan berhasil dikirim (TERLAMBAT - lewat 23:30 WITA)'
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

        $reportsQuery = KpiDailyReport::query()
            ->with('user:id,name')
            ->with('user.jobPosition:id,name')
            ->latest('report_date');

        if ($isAdmin) {
            // CEO/superadmin monitor the whole area — reports from every member
            // whose position belongs to this area, read-only.
            $reportsQuery->whereHas('user.jobPosition', fn ($q) => $q->where('area_slug', $area));

            // Area may span multiple positions; use the first one that actually
            // has a report template so the list can label field values.
            $templatePosition = Position::where('area_slug', $area)
                ->whereHas('reportFields')
                ->orderBy('name')
                ->first();
            $reportFields = $this->reportingService->getReportFieldsTemplate($templatePosition?->name);
        } else {
            $reportsQuery->where('user_id', $user->id);
            $reportFields = $this->reportingService->getReportFieldsTemplate($positionName);
        }

        $reports = $reportsQuery->paginate(20);

        // For SPV area, enrich reports with store names from the user's KPI tasks on that date.
        if ($area === 'spv') {
            $reports->getCollection()->transform(function ($report) {
                $store = Task::where('creator_id', $report->user_id)
                    ->where('is_kpi_task', true)
                    ->whereDate('visit_date', $report->report_date)
                    ->whereNotNull('store_id')
                    ->with('store:id,name,branch_code')
                    ->first()
                    ?->store;
                $report->store_name = $store?->name;
                $report->store_code = $store?->branch_code;

                return $report;
            });
        }

        return Inertia::render("{$area}/kpi/reports", [
            'reports' => $reports,
            'canCreate' => ! $isAdmin && $this->canSubmitReports($user),
            'allowBackdated' => $this->allowBackdatedReport(),
            'reportFields' => $reportFields,
        ]);
    }
}
