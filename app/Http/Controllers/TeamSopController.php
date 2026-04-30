<?php

namespace App\Http\Controllers;

use App\Http\Requests\ParseTeamSopRequest;
use App\Http\Requests\UpdateDocumentSopStepRequest;
use App\Jobs\ParseTeamSopJob;
use App\Models\DocumentSopStep;
use App\Models\KanbanColumn;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class TeamSopController extends Controller
{
    public function parse(
        ParseTeamSopRequest $request,
        Team $team,
    ): RedirectResponse {
        $document = $team->documents()
            ->whereKey($request->string('document_id')->toString())
            ->where('is_sop', true)
            ->first();

        abort_unless($document !== null, 404, 'Dokumen SOP tidak ditemukan untuk tim ini.');
        abort_if($document->sop_parse_status === 'completed' || $document->sopSteps()->exists(), 400, 'SOP AI Parser hanya bisa dilakukan 1x per SOP.');

        try {
            $platform = $request->input('platform') ?: $this->defaultPlatform();
        } catch (RuntimeException $exception) {
            return back()->withErrors([
                'sop_parse' => $exception->getMessage(),
            ]);
        }

        $document->forceFill([
            'sop_parse_status' => 'queued',
            'sop_parse_platform' => $platform,
            'sop_parse_error' => null,
            'sop_parse_queued_at' => now(),
            'sop_parse_started_at' => null,
            'sop_parse_completed_at' => null,
        ])->save();

        ParseTeamSopJob::dispatch($document->id, $platform);

        return back();
    }

    public function storeStep(Request $request, Team $team): RedirectResponse
    {
        $document = $team->documents()
            ->where('is_sop', true)
            ->first();

        abort_unless($document !== null, 404, 'Dokumen SOP tidak ditemukan untuk tim ini.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $maxOrder = $document->sopSteps()->max('sequence_order') ?? 0;

        $document->sopSteps()->create([
            'name' => $validated['name'],
            'sequence_order' => $maxOrder + 1,
            'action' => '',
            'keywords' => [],
            'required_evidence' => 'comment',
            'priority' => 'medium',
            'weight' => 3,
            'min_comment' => 1,
            'min_media' => 0,
            'is_mandatory' => true,
        ]);

        return back();
    }

    public function updateStep(
        UpdateDocumentSopStepRequest $request,
        Team $team,
        DocumentSopStep $documentSopStep,
    ): RedirectResponse {
        $documentSopStep->loadMissing('document');
        abort_unless($documentSopStep->document?->team_id === $team->id, 404);

        $validated = $request->validated();
        $kanbanColumnId = $validated['kanban_column_id'] ?? null;
        $expectedColumn = null;

        if (is_string($kanbanColumnId) && $kanbanColumnId !== '') {
            $kanbanColumn = KanbanColumn::query()
                ->whereKey($kanbanColumnId)
                ->whereHas('kanban', fn ($query) => $query->where('team_id', $team->id))
                ->first();

            if ($kanbanColumn === null) {
                throw ValidationException::withMessages([
                    'kanban_column_id' => 'Kolom kanban tidak valid untuk tim ini.',
                ]);
            }

            $expectedColumn = $kanbanColumn->title;
        }

        $documentSopStep->update([
            'name' => $validated['name'],
            'action' => $validated['action'] ?? '',
            'keywords' => $validated['keywords'] ?? [],
            'required_evidence' => $validated['required_evidence'],
            'priority' => $validated['priority'],
            'weight' => $validated['weight'],
            'min_comment' => $validated['min_comment'],
            'min_media' => $validated['min_media'],
            'kanban_column_id' => $kanbanColumnId,
            'expected_column' => $expectedColumn,
            'score_kurang' => $validated['score_kurang'],
            'score_cukup' => $validated['score_cukup'],
            'score_sangat_baik' => $validated['score_sangat_baik'],
            'is_mandatory' => $validated['is_mandatory'],
        ]);

        return back();
    }

    public function reorderSteps(Request $request, Team $team): RedirectResponse
    {
        $document = $team->documents()
            ->where('is_sop', true)
            ->first();

        abort_unless($document !== null, 404);

        $validated = $request->validate([
            'steps' => ['required', 'array'],
            'steps.*.id' => ['required', 'string', 'exists:document_sop_steps,id'],
            'steps.*.sequence_order' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($document, $validated) {
            foreach ($validated['steps'] as $stepData) {
                $document->sopSteps()
                    ->where('id', $stepData['id'])
                    ->update(['sequence_order' => $stepData['sequence_order']]);
            }
        });

        return back();
    }

    public function destroyStep(Team $team, DocumentSopStep $documentSopStep): RedirectResponse
    {
        $documentSopStep->loadMissing('document');
        abort_unless($documentSopStep->document?->team_id === $team->id, 404);

        $documentSopStep->delete();

        return back();
    }

    private function defaultPlatform(): string
    {
        return match (true) {
            filled(config('services.9route.api_key')) => '9route',
            filled(config('services.openai.api_key')) => 'openai',
            filled(config('services.anthropic.api_key')) => 'anthropic',
            filled(config('services.gemini.api_key')) => 'gemini',
            default => throw new RuntimeException('Belum ada provider AI yang dikonfigurasi untuk parsing SOP.'),
        };
    }
}
