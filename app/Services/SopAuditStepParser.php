<?php

namespace App\Services;

use Illuminate\Support\Str;

class SopAuditStepParser
{
    /**
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done?: bool}>  $kanbanColumns
     * @return array<int, array{
     *     id: string,
     *     name: string,
     *     action: string,
     *     required_evidence: 'comment'|'media'|'both',
     *     keywords: array<int, string>,
     *     weight: int,
     *     priority: 'high'|'medium'|'low',
     *     min_comment: int,
     *     min_media: int,
     *     sequence_order: int,
     *     expected_column: ?string,
     *     is_mandatory: bool
     * }>
     */
    public function parse(?string $content, array $kanbanColumns = []): array
    {
        $segments = $this->extractSegments($content);

        return collect($segments)
            ->values()
            ->map(fn (string $segment, int $index): array => $this->buildStep($segment, $index + 1, $kanbanColumns))
            ->all();
    }

    /**
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done?: bool}>  $kanbanColumns
     * @return array{
     *     id: string,
     *     name: string,
     *     action: string,
     *     required_evidence: 'comment'|'media'|'both',
     *     keywords: array<int, string>,
     *     weight: int,
     *     priority: 'high'|'medium'|'low',
     *     min_comment: int,
     *     min_media: int,
     *     sequence_order: int,
     *     expected_column: ?string,
     *     is_mandatory: bool
     * }
     */
    private function buildStep(string $segment, int $sequenceOrder, array $kanbanColumns): array
    {
        [$name, $action] = $this->inferNameAndAction($segment);

        $requiresMedia = $this->containsAny($segment, [
            'foto', 'photo', 'gambar', 'lampiran', 'attachment', 'screenshot', 'video', 'bukti visual', 'dokumentasi',
        ]);
        $mediaOnly = $requiresMedia && $this->containsAny($segment, ['unggah', 'upload']) && ! $this->containsAny($segment, ['komentar', 'catat', 'tulis']);
        $isOptional = $this->containsAny($segment, ['opsional', 'jika perlu', 'bila perlu', 'apabila perlu']);
        $isCritical = $this->containsAny($segment, ['wajib', 'harus', 'pastikan', 'sebelum', 'utama', 'kritikal']);

        $requiredEvidence = match (true) {
            $mediaOnly => 'media',
            $requiresMedia => 'both',
            default => 'comment',
        };

        $priority = match (true) {
            $isCritical => 'high',
            $isOptional => 'low',
            default => 'medium',
        };

        $weight = match ($priority) {
            'high' => $requiresMedia ? 5 : 4,
            'low' => 1,
            default => $requiresMedia ? 4 : 3,
        };

        $keywords = $this->extractKeywords($segment, $name);

        return [
            'id' => 'S'.$sequenceOrder,
            'name' => $name,
            'action' => $action,
            'required_evidence' => $requiredEvidence,
            'keywords' => $keywords,
            'weight' => $weight,
            'priority' => $priority,
            'min_comment' => $mediaOnly ? 0 : ($isOptional ? 0 : 1),
            'min_media' => $requiresMedia ? 1 : 0,
            'sequence_order' => $sequenceOrder,
            'expected_column' => $this->matchExpectedColumn($segment, $keywords, $kanbanColumns),
            'is_mandatory' => ! $isOptional,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function inferNameAndAction(string $segment): array
    {
        $cleanSegment = trim($segment);

        if (str_contains($cleanSegment, ':')) {
            [$possibleName, $possibleAction] = array_pad(explode(':', $cleanSegment, 2), 2, '');
            $possibleName = Str::of($possibleName)->squish()->trim('-')->toString();
            $possibleAction = Str::of($possibleAction)->squish()->toString();

            if ($possibleName !== '' && $possibleAction !== '') {
                return [$possibleName, $possibleAction];
            }
        }

        $words = preg_split('/\s+/', $cleanSegment) ?: [];
        $name = Str::of(implode(' ', array_slice($words, 0, min(8, count($words)))))
            ->trim()
            ->trim('.')
            ->headline()
            ->toString();

        return [$name, $cleanSegment];
    }

    /**
     * @return array<int, string>
     */
    private function extractSegments(?string $content): array
    {
        $normalized = $this->normalizeContent($content);

        if ($normalized === '') {
            return [];
        }

        $lineCandidates = collect(preg_split('/\n+/', $normalized) ?: [])
            ->map(fn (string $line): string => $this->cleanSegment($line))
            ->filter(fn (string $line): bool => $this->isValidSegment($line))
            ->values();

        if ($lineCandidates->count() >= 2) {
            return $lineCandidates->all();
        }

        return collect(preg_split('/(?<=[.!?;])\s+/u', $normalized) ?: [])
            ->map(fn (string $sentence): string => $this->cleanSegment($sentence))
            ->filter(fn (string $sentence): bool => $this->isValidSegment($sentence))
            ->values()
            ->all();
    }

    private function normalizeContent(?string $content): string
    {
        if (! is_string($content) || trim($content) === '') {
            return '';
        }

        $withLineBreaks = preg_replace('/<(\/p|br\s*\/?|\/li|\/h[1-6])>/i', "\n", $content) ?? $content;
        $withListBreaks = preg_replace('/<(li|p|h[1-6])[^>]*>/i', "\n", $withLineBreaks) ?? $withLineBreaks;

        return collect(preg_split('/\R/u', html_entity_decode(strip_tags($withListBreaks))) ?: [])
            ->map(fn (string $line): string => Str::of($line)->squish()->toString())
            ->filter()
            ->implode("\n");
    }

    private function cleanSegment(string $segment): string
    {
        return Str::of($segment)
            ->replaceMatches('/^\s*[\-\*\x{2022}\d]+[.)-]?\s*/u', '')
            ->trim()
            ->trim('.')
            ->squish()
            ->toString();
    }

    private function isValidSegment(string $segment): bool
    {
        return Str::length($segment) >= 12 && preg_match('/[[:alpha:]]/u', $segment) === 1;
    }

    /**
     * @return array<int, string>
     */
    private function extractKeywords(string $segment, string $name): array
    {
        $tokens = collect(array_merge(
            $this->tokenize($name),
            $this->tokenize($segment),
        ))
            ->filter(fn (string $token): bool => ! in_array($token, $this->stopwords(), true))
            ->unique()
            ->values();

        return $tokens->take(8)->all();
    }

    /**
     * @param  array<int, array{id: string, title: string, order: int|string|null, is_done?: bool}>  $kanbanColumns
     */
    private function matchExpectedColumn(string $segment, array $keywords, array $kanbanColumns): ?string
    {
        $needleTokens = collect(array_merge($keywords, $this->tokenize($segment)))
            ->unique()
            ->values()
            ->all();

        $bestColumn = collect($kanbanColumns)
            ->map(function (array $column) use ($needleTokens): array {
                $title = (string) ($column['title'] ?? '');
                $titleTokens = $this->tokenize($title);
                $sharedTokens = array_intersect($needleTokens, $titleTokens);
                $score = collect($sharedTokens)->sum(fn (string $token): int => max(3, Str::length($token) * 2));

                $primaryToken = $needleTokens[0] ?? null;

                if (is_string($primaryToken) && $primaryToken !== '' && Str::contains(Str::lower($title), Str::lower($primaryToken))) {
                    $score += 4;
                }

                return [
                    'title' => $title,
                    'score' => $score,
                    'order' => (int) ($column['order'] ?? 0),
                ];
            })
            ->reduce(function (?array $best, array $candidate): ?array {
                if ($best === null) {
                    return $candidate;
                }

                if ($candidate['score'] > $best['score']) {
                    return $candidate;
                }

                if ($candidate['score'] === $best['score'] && $candidate['order'] < $best['order']) {
                    return $candidate;
                }

                return $best;
            });

        if (! is_array($bestColumn) || ($bestColumn['score'] ?? 0) <= 0) {
            return null;
        }

        return $bestColumn['title'];
    }

    /**
     * @return array<int, string>
     */
    private function tokenize(string $value): array
    {
        return collect(preg_split('/[^[:alnum:]]+/u', Str::lower($value)) ?: [])
            ->map(fn (string $token): string => trim($token))
            ->filter(fn (string $token): bool => Str::length($token) >= 3)
            ->values()
            ->all();
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        $normalizedHaystack = Str::lower($haystack);

        return collect($needles)->contains(fn (string $needle): bool => Str::contains($normalizedHaystack, Str::lower($needle)));
    }

    /**
     * @return array<int, string>
     */
    private function stopwords(): array
    {
        return [
            'dan', 'yang', 'untuk', 'dengan', 'atau', 'agar', 'pada', 'dari', 'setelah', 'sebelum',
            'harus', 'wajib', 'dalam', 'setiap', 'semua', 'hasil', 'lalu', 'jika', 'bila', 'saat',
            'oleh', 'para', 'serta', 'kepada', 'sebagai', 'adalah', 'sudah', 'belum', 'tidak',
        ];
    }
}
