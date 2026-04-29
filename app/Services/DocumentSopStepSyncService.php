<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\DB;

class DocumentSopStepSyncService
{
    /**
     * @param  array<int, array<string, mixed>>  $steps
     */
    public function replace(Document $document, array $steps): void
    {
        DB::transaction(function () use ($document, $steps): void {
            $document->sopSteps()->delete();

            foreach (array_values($steps) as $index => $step) {
                $weight = (int) ($step['weight'] ?? 3);
                $scoreKurang = max(0, (int) ceil($weight * 0.4));
                $scoreCukup = max($scoreKurang, (int) ceil($weight * 0.7));
                $scoreSangatBaik = max($scoreCukup, $weight);

                $document->sopSteps()->create([
                    'sequence_order' => (int) ($step['sequence_order'] ?? ($index + 1)),
                    'name' => (string) ($step['name'] ?? 'Step '.($index + 1)),
                    'action' => (string) ($step['action'] ?? ''),
                    'keywords' => array_values(array_filter((array) ($step['keywords'] ?? []), 'is_string')),
                    'required_evidence' => (string) ($step['required_evidence'] ?? 'comment'),
                    'priority' => (string) ($step['priority'] ?? 'medium'),
                    'weight' => $weight,
                    'min_comment' => (int) ($step['min_comment'] ?? 1),
                    'min_media' => (int) ($step['min_media'] ?? 0),
                    'expected_column' => isset($step['expected_column']) ? (string) $step['expected_column'] : null,
                    'is_mandatory' => (bool) ($step['is_mandatory'] ?? true),
                    'parsed_by' => (string) ($step['parsed_by'] ?? 'ai'),
                    'parsed_from' => isset($step['parsed_from']) ? (string) $step['parsed_from'] : null,
                    'score_kurang' => (int) ($step['score_kurang'] ?? $scoreKurang),
                    'score_cukup' => (int) ($step['score_cukup'] ?? $scoreCukup),
                    'score_sangat_baik' => (int) ($step['score_sangat_baik'] ?? $scoreSangatBaik),
                ]);
            }
        });
    }
}
