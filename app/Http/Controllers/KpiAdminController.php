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
        $positions = Position::with(['kpiDefinitions' => fn ($q) => $q->orderBy('sequence_order')])
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
        ]);

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
        ]);

        $definition->update($validated);

        return back()->with('success', 'Task definition berhasil diupdate');
    }

    public function destroyDefinition(KpiTaskDefinition $definition): RedirectResponse
    {
        $tasksCount = $definition->tasks()->count();

        if ($tasksCount > 0) {
            return back()->withErrors(['error' => "Tidak dapat menghapus. {$tasksCount} tasks sudah dibuat dari definition ini."]);
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
