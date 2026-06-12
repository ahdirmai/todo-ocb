<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyScore;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
