<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Scores task comments against Kanban column names using word/similarity matching.
 *
 * Scoring rules:
 * - 10: Comment matches column AND has file attachment
 * - 6:  Comment matches column text only (no attachment)
 * - 3:  No matching comment, but task is in a subsequent column (step was passed)
 * - 0:  No evidence at all
 */
class TaskColumnScoringService
{
    /**
     * Score a single task against all audit columns.
     *
     * @param  array{
     *     id: string,
     *     title: string,
     *     status: ?string,
     *     is_done: bool,
     *     due_date: ?string,
     *     created_at: ?string,
     *     comments_count: int,
     *     attachment_count: int,
     *     comments: array<int, array{author: ?string, content: string, attachments_count: int}>
     * }  $task
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done: bool}>  $kanbanColumns
     * @return array{
     *     skor_total_task: int,
     *     skor_maksimal_task: int,
     *     compliance_persen: string,
     *     quality: string,
     *     breakdown_jalur: array<int, array{nama_jalur: string, skor: int, penjelasan: string}>
     * }
     */
    public function scoreTask(array $task, array $kanbanColumns): array
    {
        $currentColumnTitle = $task['status'] ?? null;
        $currentColumnOrder = $this->findColumnOrder($currentColumnTitle, $kanbanColumns);

        $breakdownJalur = [];
        $totalScore = 0;

        foreach ($kanbanColumns as $index => $column) {
            $columnTitle = $column['title'] ?? '';
            $columnOrder = (int) ($column['order'] ?? ($index + 1));

            $matchResult = $this->findMatchingComment($columnTitle, $task['comments'] ?? []);

            if ($matchResult !== null) {
                if ($matchResult['has_attachment']) {
                    $skor = 10;
                    $penjelasan = 'Komentar cocok + File terlampir';
                } else {
                    $skor = 6;
                    $penjelasan = 'Hanya komentar (tanpa lampiran file)';
                }
            } elseif ($this->isStepPassed($columnOrder, $currentColumnOrder)) {
                $skor = 3;
                $penjelasan = 'Tanpa evidence, tapi sudah di step selanjutnya';
            } else {
                $skor = 0;
                $penjelasan = 'Tidak ada evidence';
            }

            $totalScore += $skor;
            $breakdownJalur[] = [
                'nama_jalur' => $columnTitle,
                'skor' => $skor,
                'penjelasan' => $penjelasan,
            ];
        }

        $maxScore = count($kanbanColumns) * 10;
        $compliancePersen = $maxScore > 0
            ? number_format(($totalScore / $maxScore) * 100, 1)
            : '0.0';

        $quality = $this->determineQuality($compliancePersen);

        return [
            'skor_total_task' => $totalScore,
            'skor_maksimal_task' => $maxScore,
            'compliance_persen' => $compliancePersen,
            'quality' => $quality,
            'breakdown_jalur' => $breakdownJalur,
        ];
    }

    /**
     * Try to find a comment whose content matches (word/similar) the column title.
     *
     * @param  array<int, array{author: ?string, content: string, attachments_count: int}>  $comments
     * @return array{has_attachment: bool}|null
     */
    private function findMatchingComment(string $columnTitle, array $comments): ?array
    {
        if ($columnTitle === '' || count($comments) === 0) {
            return null;
        }

        $columnWords = $this->extractSignificantWords($columnTitle);

        if (count($columnWords) === 0) {
            return null;
        }

        foreach ($comments as $comment) {
            $content = (string) ($comment['content'] ?? '');

            if ($content === '') {
                continue;
            }

            if ($this->isWordMatch($columnWords, $content)) {
                return [
                    'has_attachment' => ((int) ($comment['attachments_count'] ?? 0)) > 0,
                ];
            }
        }

        return null;
    }

    /**
     * Check if significant words from the column title appear in the comment content.
     * Uses a threshold: at least 50% of column words must appear, with a minimum of 1.
     *
     * @param  string[]  $columnWords
     */
    private function isWordMatch(array $columnWords, string $content): bool
    {
        $normalizedContent = $this->normalizeText($content);

        $matchedCount = 0;
        foreach ($columnWords as $word) {
            if (Str::contains($normalizedContent, $word, ignoreCase: true)) {
                $matchedCount++;
            }
        }

        $threshold = max(1, (int) ceil(count($columnWords) * 0.5));

        return $matchedCount >= $threshold;
    }

    /**
     * Extract significant words from a column title, filtering out stopwords.
     *
     * @return string[]
     */
    private function extractSignificantWords(string $title): array
    {
        $stopwords = [
            'dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan',
            'pada', 'adalah', 'ini', 'itu', 'oleh', 'akan', 'sudah',
            'belum', 'juga', 'serta', 'dan', 'the', 'and', 'or', 'of',
            'in', 'to', 'for', 'a', 'an', 'tgl', 'no',
        ];

        $normalized = $this->normalizeText($title);
        $words = preg_split('/[\s,\-\/\.\(\)]+/', $normalized, -1, PREG_SPLIT_NO_EMPTY);

        if ($words === false) {
            return [];
        }

        return array_values(array_filter(
            $words,
            fn (string $word): bool => mb_strlen($word) >= 3 && ! in_array(mb_strtolower($word), $stopwords, true),
        ));
    }

    /**
     * Normalize text: strip tags, lowercase, squish whitespace.
     */
    private function normalizeText(string $text): string
    {
        $stripped = strip_tags($text);

        return mb_strtolower(preg_replace('/\s+/', ' ', trim($stripped)) ?? $stripped);
    }

    /**
     * Check if a column step was passed (task is in a later column).
     */
    private function isStepPassed(int $columnOrder, ?int $currentColumnOrder): bool
    {
        if ($currentColumnOrder === null) {
            return false;
        }

        return $currentColumnOrder > $columnOrder;
    }

    /**
     * Find the order of a column by its title.
     *
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done: bool}>  $kanbanColumns
     */
    private function findColumnOrder(?string $columnTitle, array $kanbanColumns): ?int
    {
        if ($columnTitle === null) {
            return null;
        }

        foreach ($kanbanColumns as $index => $column) {
            if (mb_strtolower($column['title'] ?? '') === mb_strtolower($columnTitle)) {
                return (int) ($column['order'] ?? ($index + 1));
            }
        }

        return null;
    }

    /**
     * Determine quality label based on compliance percentage.
     */
    private function determineQuality(string $compliancePersen): string
    {
        $value = (float) $compliancePersen;

        return match (true) {
            $value >= 80.0 => 'Sangat Baik — evidence lengkap dan terdokumentasi',
            $value >= 60.0 => 'Baik — mayoritas step terdokumentasi',
            $value >= 40.0 => 'Cukup — beberapa step belum terdokumentasi',
            default => 'Kurang — banyak step tanpa evidence',
        };
    }

    /**
     * Determine performance label based on compliance percentage.
     */
    public function determinePerformanceLabel(string $compliancePersen): string
    {
        $value = (float) $compliancePersen;

        return match (true) {
            $value > 80.0 => 'excellent',
            $value > 60.0 => 'good',
            $value > 40.0 => 'watch',
            default => 'critical',
        };
    }
}
