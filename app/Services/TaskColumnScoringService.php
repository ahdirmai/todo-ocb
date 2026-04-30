<?php

namespace App\Services;

use Illuminate\Support\Str;

class TaskColumnScoringService
{
    /**
     * Score a single task against SOP steps.
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
     * @param  array<int, array{
     *     name: string,
     *     expected_column: ?string,
     *     score_kurang: int,
     *     score_cukup: int,
     *     score_sangat_baik: int,
     *     min_comment: int,
     *     min_media: int,
     *     is_mandatory: bool
     * }>  $sopSteps
     * @return array{
     *     skor_total_task: int,
     *     skor_maksimal_task: int,
     *     compliance_persen: string,
     *     quality: string,
     *     breakdown_jalur: array<int, array{
     *         nama_jalur: string,
     *         skor: int,
     *         skor_maksimal: int,
     *         score_kurang: int,
     *         score_cukup: int,
     *         score_sangat_baik: int,
     *         level: string,
     *         penjelasan: string,
     *         is_mandatory: bool
     *     }>
     * }
     */
    public function scoreTask(array $task, array $kanbanColumns, array $sopSteps = []): array
    {
        $currentColumnTitle = $task['status'] ?? null;
        $currentColumnOrder = $this->findColumnOrder($currentColumnTitle, $kanbanColumns);

        $breakdownJalur = [];
        $totalScore = 0;
        $totalMaxScore = 0;

        if (count($sopSteps) > 0) {
            $totalSteps = count($sopSteps);
            foreach ($sopSteps as $index => $step) {
                $isLastStep = ($index === $totalSteps - 1);
                $result = $this->scoreStepWithSop($step, $task, $kanbanColumns, $currentColumnOrder, $isLastStep);
                $totalScore += $result['skor'];
                $totalMaxScore += $result['skor_maksimal'];
                $breakdownJalur[] = $result;
            }
        } else {
            $totalColumns = count($kanbanColumns);
            foreach ($kanbanColumns as $index => $column) {
                $isLastStep = ($index === $totalColumns - 1);
                $result = $this->scoreStepLegacy($column, $index, $task, $kanbanColumns, $currentColumnOrder, $isLastStep);
                $totalScore += $result['skor'];
                $totalMaxScore += $result['skor_maksimal'];
                $breakdownJalur[] = $result;
            }
        }

        $compliancePersen = $totalMaxScore > 0
            ? number_format(($totalScore / $totalMaxScore) * 100, 1)
            : '0.0';

        return [
            'skor_total_task' => $totalScore,
            'skor_maksimal_task' => $totalMaxScore,
            'compliance_persen' => $compliancePersen,
            'quality' => $this->determineQuality($compliancePersen),
            'breakdown_jalur' => $breakdownJalur,
        ];
    }

    /**
     * @param  array{name: string, expected_column: ?string, score_kurang: int, score_cukup: int, score_sangat_baik: int, min_comment: int, min_media: int, is_mandatory: bool}  $step
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done: bool}>  $kanbanColumns
     */
    private function scoreStepWithSop(array $step, array $task, array $kanbanColumns, ?int $currentColumnOrder, bool $isLastStep = false): array
    {
        $expectedColumn = $step['expected_column'] ?? $step['name'];
        $columnOrder = $this->findColumnOrder($expectedColumn, $kanbanColumns);

        $scoreKurang = (int) ($step['score_kurang'] ?? 2);
        $scoreCukup = (int) ($step['score_cukup'] ?? 4);
        $scoreSangatBaik = (int) ($step['score_sangat_baik'] ?? 5);
        $minComment = (int) ($step['min_comment'] ?? 0);
        $minMedia = (int) ($step['min_media'] ?? 0);

        $matchResult = $this->findMatchingComment($expectedColumn, $task['comments'] ?? []);

        // Jika task sudah mencapai atau melewati step terakhir
        if ($isLastStep && $currentColumnOrder !== null && $columnOrder !== null && $currentColumnOrder >= $columnOrder) {
            $skor = $scoreSangatBaik;
            $level = 'sangat_baik';
            $penjelasan = 'Auto max score karena sudah mencapai step terakhir';
        } elseif ($matchResult !== null) {
            $commentCount = $this->countMatchingComments($expectedColumn, $task['comments'] ?? []);
            $attachmentCount = $matchResult['attachment_count'];

            $meetsMinComment = $minComment === 0 || $commentCount >= $minComment;
            $meetsMinMedia = $minMedia === 0 || $attachmentCount >= $minMedia;

            if ($meetsMinComment && $meetsMinMedia) {
                $skor = $scoreSangatBaik;
                $level = 'sangat_baik';
                $penjelasan = 'Evidence lengkap (komentar + lampiran memenuhi syarat)';
            } else {
                $skor = $scoreCukup;
                $level = 'cukup';
                $parts = [];
                if (! $meetsMinComment) {
                    $parts[] = "komentar {$commentCount}/{$minComment}";
                }
                if (! $meetsMinMedia) {
                    $parts[] = "lampiran {$attachmentCount}/{$minMedia}";
                }
                $penjelasan = 'Evidence ada tapi belum lengkap: '.implode(', ', $parts);
            }
        } elseif ($this->isStepPassed($columnOrder, $currentColumnOrder)) {
            $skor = $scoreKurang;
            $level = 'kurang';
            $penjelasan = 'Tanpa evidence, tapi sudah di step selanjutnya';
        } else {
            $skor = 0;
            $level = 'none';
            $penjelasan = 'Tidak ada evidence';
        }

        return [
            'nama_jalur' => $expectedColumn,
            'skor' => $skor,
            'skor_maksimal' => $scoreSangatBaik,
            'score_kurang' => $scoreKurang,
            'score_cukup' => $scoreCukup,
            'score_sangat_baik' => $scoreSangatBaik,
            'level' => $level,
            'penjelasan' => $penjelasan,
            'is_mandatory' => (bool) ($step['is_mandatory'] ?? false),
        ];
    }

    /**
     * Legacy scoring for backward compatibility when no SOP steps are available.
     *
     * @param  array{id: string, title: string, order: int|string|null, is_done: bool}  $column
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done: bool}>  $kanbanColumns
     */
    private function scoreStepLegacy(array $column, int $index, array $task, array $kanbanColumns, ?int $currentColumnOrder, bool $isLastStep = false): array
    {
        $columnTitle = $column['title'] ?? '';
        $columnOrder = (int) ($column['order'] ?? ($index + 1));

        $matchResult = $this->findMatchingComment($columnTitle, $task['comments'] ?? []);

        // Jika task sudah mencapai atau melewati step terakhir
        if ($isLastStep && $currentColumnOrder !== null && $currentColumnOrder >= $columnOrder) {
            $skor = 10;
            $level = 'sangat_baik';
            $penjelasan = 'Auto max score karena sudah mencapai step terakhir';
        } elseif ($matchResult !== null) {
            if ($matchResult['has_attachment']) {
                $skor = 10;
                $level = 'sangat_baik';
                $penjelasan = 'Komentar cocok + File terlampir';
            } else {
                $skor = 6;
                $level = 'cukup';
                $penjelasan = 'Hanya komentar (tanpa lampiran file)';
            }
        } elseif ($this->isStepPassed($columnOrder, $currentColumnOrder)) {
            $skor = 3;
            $level = 'kurang';
            $penjelasan = 'Tanpa evidence, tapi sudah di step selanjutnya';
        } else {
            $skor = 0;
            $level = 'none';
            $penjelasan = 'Tidak ada evidence';
        }

        return [
            'nama_jalur' => $columnTitle,
            'skor' => $skor,
            'skor_maksimal' => 10,
            'score_kurang' => 3,
            'score_cukup' => 6,
            'score_sangat_baik' => 10,
            'level' => $level,
            'penjelasan' => $penjelasan,
            'is_mandatory' => false,
        ];
    }

    /**
     * Count matching comments for a column title.
     *
     * @param  array<int, array{author: ?string, content: string, attachments_count: int}>  $comments
     */
    private function countMatchingComments(string $columnTitle, array $comments): int
    {
        if ($columnTitle === '' || count($comments) === 0) {
            return 0;
        }

        $columnWords = $this->extractSignificantWords($columnTitle);

        if (count($columnWords) === 0) {
            return 0;
        }

        $count = 0;
        foreach ($comments as $comment) {
            $content = (string) ($comment['content'] ?? '');
            if ($content !== '' && $this->isWordMatch($columnWords, $content)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @param  array<int, array{author: ?string, content: string, attachments_count: int}>  $comments
     * @return array{has_attachment: bool, attachment_count: int}|null
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

        $totalAttachments = 0;
        $found = false;

        foreach ($comments as $comment) {
            $content = (string) ($comment['content'] ?? '');

            if ($content === '') {
                continue;
            }

            if ($this->isWordMatch($columnWords, $content)) {
                $found = true;
                $totalAttachments += (int) ($comment['attachments_count'] ?? 0);
            }
        }

        if (! $found) {
            return null;
        }

        return [
            'has_attachment' => $totalAttachments > 0,
            'attachment_count' => $totalAttachments,
        ];
    }

    /**
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

    private function normalizeText(string $text): string
    {
        $stripped = strip_tags($text);

        return mb_strtolower(preg_replace('/\s+/', ' ', trim($stripped)) ?? $stripped);
    }

    private function isStepPassed(?int $columnOrder, ?int $currentColumnOrder): bool
    {
        if ($currentColumnOrder === null || $columnOrder === null) {
            return false;
        }

        return $currentColumnOrder > $columnOrder;
    }

    /**
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
