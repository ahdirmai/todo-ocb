<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyScore;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionReportField;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KpiAdminController extends Controller
{
    public function definitions(): Response
    {
        $positions = Position::with(['kpiDefinitions' => fn ($q) => $q->where('is_active', true)->orderBy('sequence_order')])
            ->orderBy('name')
            ->get();

        return Inertia::render('kpi/admin/definitions', [
            'positions' => $positions,
        ]);
    }

    public function storeDefinition(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'position_id' => 'required|exists:positions,id',
            'category' => 'required|string|max:255',
            'task_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'work_method' => 'nullable|string',
            'verification_method' => 'nullable|string',
            'weight' => 'required|numeric|min:0|max:100',
            'sequence_order' => 'required|integer|min:1',
            'can_upload_proof' => 'boolean',
            'auto_done_on_report' => 'boolean',
            'require_video_upload' => 'boolean',
            'minimum_photos' => 'integer|min:0|max:20',
        ]);

        if (($validated['auto_done_on_report'] ?? false)
            && $this->autoDoneWeightExceeded($validated['position_id'], (float) $validated['weight'])) {
            return back()->withErrors([
                'auto_done_on_report' => 'Total bobot task auto-done untuk posisi ini melebihi 10% (maksimal 10%).',
            ]);
        }

        KpiTaskDefinition::create(array_merge($validated, ['is_active' => true]));

        return back()->with('success', 'Task definition berhasil ditambahkan');
    }

    public function updateDefinition(Request $request, KpiTaskDefinition $definition): RedirectResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:255',
            'task_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'work_method' => 'nullable|string',
            'verification_method' => 'nullable|string',
            'weight' => 'required|numeric|min:0|max:100',
            'sequence_order' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'can_upload_proof' => 'boolean',
            'auto_done_on_report' => 'boolean',
            'require_video_upload' => 'boolean',
            'minimum_photos' => 'integer|min:0|max:20',
        ]);

        if (($validated['auto_done_on_report'] ?? false)
            && $this->autoDoneWeightExceeded($definition->position_id, (float) $validated['weight'], $definition->id)) {
            return back()->withErrors([
                'auto_done_on_report' => 'Total bobot task auto-done untuk posisi ini melebihi 10% (maksimal 10%).',
            ]);
        }

        $definition->update($validated);

        return back()->with('success', 'Task definition berhasil diupdate');
    }

    /**
     * True when adding `$incomingWeight` of auto-done weight would push the
     * position's total auto-done weight above the 10% cap. Excludes the
     * definition being updated (via `$ignoreId`) so its own weight isn't
     * double-counted.
     */
    protected function autoDoneWeightExceeded(string $positionId, float $incomingWeight, ?string $ignoreId = null): bool
    {
        $existing = KpiTaskDefinition::where('position_id', $positionId)
            ->where('is_active', true)
            ->where('auto_done_on_report', true)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->sum('weight');

        return ((float) $existing + $incomingWeight) > 10.0;
    }

    public function destroyDefinition(KpiTaskDefinition $definition): RedirectResponse
    {
        // Definitions with generated tasks are soft-deactivated instead of hard
        // deleted so existing tasks, comments, and scores stay intact. Inactive
        // definitions are excluded from task generation and the admin list.
        if ($definition->tasks()->exists()) {
            $definition->update(['is_active' => false]);

            return back()->with('success', 'Task definition dinonaktifkan (masih ada task lama yang memakainya).');
        }

        $definition->delete();

        return back()->with('success', 'Task definition berhasil dihapus');
    }

    public function reportFields(): Response
    {
        $positions = Position::with(['reportFields' => fn ($q) => $q->orderBy('sort_order')])
            ->orderBy('name')
            ->get();

        return Inertia::render('kpi/admin/report-fields', [
            'positions' => $positions,
        ]);
    }

    public function storeReportField(Request $request): RedirectResponse
    {
        $validated = $this->validateReportField($request);

        PositionReportField::create($validated);

        return back()->with('success', 'Report field berhasil ditambahkan');
    }

    public function updateReportField(Request $request, PositionReportField $reportField): RedirectResponse
    {
        $validated = $this->validateReportField($request, $reportField);

        $reportField->update($validated);

        return back()->with('success', 'Report field berhasil diupdate');
    }

    public function destroyReportField(PositionReportField $reportField): RedirectResponse
    {
        $reportField->delete();

        return back()->with('success', 'Report field berhasil dihapus');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateReportField(Request $request, ?PositionReportField $reportField = null): array
    {
        $positionId = $reportField?->position_id ?? $request->input('position_id');

        $uniqueKey = Rule::unique('position_report_fields', 'field_key')
            ->where(fn ($q) => $q->where('position_id', $positionId));

        if ($reportField) {
            $uniqueKey->ignore($reportField->id);
        }

        return $request->validate([
            'position_id' => ['required', 'exists:positions,id'],
            'field_key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_.]+$/', $uniqueKey],
            'field_label' => ['required', 'string', 'max:200'],
            'field_type' => ['required', 'in:text,textarea,number,date,select'],
            'group_label' => ['nullable', 'string', 'max:100'],
            'is_required' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'field_options' => ['nullable', 'array'],
            'field_options.placeholder' => ['nullable', 'string', 'max:255'],
            'field_options.rows' => ['nullable', 'integer', 'min:1', 'max:20'],
            'field_options.max_length' => ['nullable', 'integer', 'min:1'],
            'field_options.options' => ['nullable', 'array'],
            'field_options.options.*' => ['string', 'max:255'],
        ]);
    }

    public function scores(): Response
    {
        $today = now()->toDateString();

        $scores = KpiDailyScore::with('user.jobPosition')
            ->where('score_date', $today)
            ->orderBy('total_score', 'desc')
            ->get();

        return Inertia::render('kpi/admin/scores', [
            'scores' => $scores,
            'date' => $today,
        ]);
    }
}
