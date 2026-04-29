<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use JsonException;
use RuntimeException;

/**
 * Parses SOP documents (markdown text or PDF via Spatie Media Library)
 * into structured audit steps using an AI provider.
 *
 * Supports: gemini, openai, anthropic
 */
class SopAiParser
{
    /**
     * @param  array{source: 'text'|'pdf'|'none', content: string|null, file_path: string|null}  $aiReadableContent
     * @param  string[]  $kanbanColumnTitles  ordered Kanban column names for step matching
     * @return array<int, array{
     *     sequence_order: int,
     *     name: string,
     *     action: string,
     *     keywords: string[],
     *     required_evidence: string,
     *     priority: string,
     *     weight: int,
     *     min_comment: int,
     *     min_media: int,
     *     expected_column: string|null,
     *     is_mandatory: bool,
     *     parsed_by: string,
     *     parsed_from: string
     * }>
     */
    public function parse(array $aiReadableContent, array $kanbanColumnTitles, string $platform): array
    {
        if ($aiReadableContent['source'] === 'none') {
            return [];
        }

        $raw = match ($platform) {
            'openai' => $this->callOpenAi($aiReadableContent, $kanbanColumnTitles),
            'anthropic' => $this->callAnthropic($aiReadableContent, $kanbanColumnTitles),
            'gemini' => $this->callGemini($aiReadableContent, $kanbanColumnTitles),
            default => throw new RuntimeException('Platform AI tidak dikenali: '.$platform),
        };

        return $this->normalize($raw, 'ai', $aiReadableContent['source']);
    }

    // ─── Gemini ──────────────────────────────────────────────────────────────

    /**
     * @param  array{source: 'text'|'pdf'|'none', content: string|null, file_path: string|null}  $content
     * @param  string[]  $columns
     * @return array<int|string, mixed>
     */
    private function callGemini(array $content, array $columns): array
    {
        $apiKey = (string) config('services.gemini.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi Gemini belum lengkap.');
        }

        $parts = [];

        if ($content['source'] === 'pdf' && $content['file_path'] !== null) {
            $path = (string) $content['file_path'];
            if (! file_exists($path)) {
                throw new RuntimeException('File PDF SOP tidak ditemukan: '.$path);
            }
            $parts[] = ['inline_data' => [
                'mime_type' => 'application/pdf',
                'data' => base64_encode((string) file_get_contents($path)),
            ]];
        } else {
            $parts[] = ['text' => (string) $content['content']];
        }

        $parts[] = ['text' => $this->systemPrompt($columns)];

        try {
            $baseUrl = rtrim((string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta/'), '/').'/';
            $model = (string) config('services.gemini.reporting_model', 'gemini-2.0-flash');

            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->asJson()
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->connectTimeout(15)
                ->timeout(120)
                ->post('models/'.$model.':generateContent', [
                    'contents' => [['parts' => $parts]],
                    'generationConfig' => ['responseMimeType' => 'application/json'],
                ]);

            $response->throw();

            $text = data_get($response->json(), 'candidates.0.content.parts.0.text');
            if (! is_string($text) || $text === '') {
                throw new RuntimeException('Gemini tidak mengembalikan hasil parsing SOP.');
            }

            return $this->decodeJson($text);
        } catch (RequestException|ConnectionException|JsonException $e) {
            throw new RuntimeException('Gagal parsing SOP via Gemini: '.$e->getMessage(), previous: $e);
        }
    }

    // ─── OpenAI ──────────────────────────────────────────────────────────────

    /**
     * @param  array{source: 'text'|'pdf'|'none', content: string|null, file_path: string|null}  $content
     * @param  string[]  $columns
     * @return array<int|string, mixed>
     */
    private function callOpenAi(array $content, array $columns): array
    {
        $apiKey = (string) config('services.openai.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi OpenAI belum lengkap.');
        }

        // OpenAI Responses API does not support inline PDF in standard mode
        $text = $content['source'] === 'text'
            ? (string) $content['content']
            : '[File PDF tidak dapat dibaca secara inline. Harap konversi ke teks terlebih dahulu.]';

        try {
            $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1/'), '/').'/';
            $model = (string) config('services.openai.reporting_model', 'gpt-4o-mini');

            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->asJson()
                ->withToken($apiKey)
                ->connectTimeout(15)
                ->timeout(120)
                ->post('responses', [
                    'model' => $model,
                    'input' => [
                        ['role' => 'system', 'content' => $this->systemPrompt($columns)],
                        ['role' => 'user', 'content' => $text],
                    ],
                    'text' => [
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'sop_steps',
                            'schema' => $this->schema(),
                            'strict' => true,
                        ],
                    ],
                ]);

            $response->throw();

            $outputText = collect($response->json('output', []))
                ->where('type', 'message')
                ->flatMap(fn (array $m): array => Arr::wrap($m['content'] ?? []))
                ->firstWhere('type', 'output_text');

            if (! is_array($outputText) || ! isset($outputText['text'])) {
                throw new RuntimeException('OpenAI tidak mengembalikan hasil parsing SOP.');
            }

            return json_decode($outputText['text'], true, flags: JSON_THROW_ON_ERROR);
        } catch (RequestException|ConnectionException|JsonException $e) {
            throw new RuntimeException('Gagal parsing SOP via OpenAI: '.$e->getMessage(), previous: $e);
        }
    }

    // ─── Anthropic ───────────────────────────────────────────────────────────

    /**
     * @param  array{source: 'text'|'pdf'|'none', content: string|null, file_path: string|null}  $content
     * @param  string[]  $columns
     * @return array<int|string, mixed>
     */
    private function callAnthropic(array $content, array $columns): array
    {
        $apiKey = (string) config('services.anthropic.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi Claude belum lengkap.');
        }

        if ($content['source'] === 'pdf' && $content['file_path'] !== null) {
            $userContent = [
                ['type' => 'document', 'source' => [
                    'type' => 'base64',
                    'media_type' => 'application/pdf',
                    'data' => base64_encode((string) file_get_contents((string) $content['file_path'])),
                ]],
                ['type' => 'text', 'text' => $this->systemPrompt($columns)],
            ];
        } else {
            $userContent = [
                ['type' => 'text', 'text' => (string) $content['content']."\n\n".$this->systemPrompt($columns)],
            ];
        }

        try {
            $baseUrl = rtrim((string) config('services.anthropic.base_url', 'https://api.anthropic.com/v1/'), '/').'/';
            $model = (string) config('services.anthropic.reporting_model', 'claude-3-5-sonnet-20241022');

            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->asJson()
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => (string) config('services.anthropic.version', '2023-06-01'),
                    'anthropic-beta' => 'pdfs-2024-09-25',
                ])
                ->connectTimeout(15)
                ->timeout(120)
                ->post('messages', [
                    'model' => $model,
                    'max_tokens' => 4096,
                    'messages' => [['role' => 'user', 'content' => $userContent]],
                ]);

            $response->throw();

            $text = data_get($response->json(), 'content.0.text');
            if (! is_string($text) || $text === '') {
                throw new RuntimeException('Claude tidak mengembalikan hasil parsing SOP.');
            }

            return $this->decodeJson($text);
        } catch (RequestException|ConnectionException|JsonException $e) {
            throw new RuntimeException('Gagal parsing SOP via Claude: '.$e->getMessage(), previous: $e);
        }
    }

    // ─── Shared helpers ───────────────────────────────────────────────────────

    /**
     * @param  string[]  $kanbanColumnTitles
     */
    private function systemPrompt(array $kanbanColumnTitles): string
    {
        $columns = implode(', ', $kanbanColumnTitles);

        return <<<PROMPT
Kamu adalah analis SOP operasional. Baca dokumen SOP yang diberikan dan ekstrak setiap langkah kerja menjadi array JSON terstruktur.

Kanban columns tim (urutan proses): [{$columns}]

Aturan ekstraksi:
- Setiap langkah SOP = satu item JSON.
- `name`: nama langkah ringkas maks 60 karakter. Cocokkan dengan nama Kanban Column jika ada.
- `action`: deskripsi 1 kalimat apa yang dilakukan pada langkah ini.
- `keywords`: array 3-8 kata kunci unik dari langkah (untuk keyword-matching komentar task).
- `expected_column`: nama Kanban Column dari daftar di atas yang paling relevan, atau null.
- `required_evidence`: "both" jika butuh foto/file, "comment" jika cukup komentar teks, "media" jika hanya file.
- `priority`: "high" jika wajib/kritikal, "low" jika opsional, "medium" lainnya.
- `is_mandatory`: true jika langkah wajib.
- Urutan harus sesuai urutan SOP.
- Output: JSON array langsung (bukan objek wrapper), tanpa markdown code block.
PROMPT;
    }

    /**
     * @return array<string, mixed>
     */
    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'steps' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'name' => ['type' => 'string'],
                            'action' => ['type' => 'string'],
                            'keywords' => ['type' => 'array', 'items' => ['type' => 'string']],
                            'required_evidence' => ['type' => 'string', 'enum' => ['comment', 'media', 'both']],
                            'priority' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
                            'expected_column' => ['type' => ['string', 'null']],
                            'is_mandatory' => ['type' => 'boolean'],
                        ],
                        'required' => ['name', 'action', 'keywords', 'required_evidence', 'priority', 'expected_column', 'is_mandatory'],
                    ],
                ],
            ],
            'required' => ['steps'],
        ];
    }

    /**
     * @param  array<int|string, mixed>  $raw
     * @return array<int, array<string, mixed>>
     */
    private function normalize(array $raw, string $parsedBy, string $parsedFrom): array
    {
        // Handle OpenAI schema wrapper: {steps: [...]}
        if (isset($raw['steps']) && is_array($raw['steps'])) {
            $raw = $raw['steps'];
        }

        return collect($raw)
            ->values()
            ->map(function (array $step, int $index) use ($parsedBy, $parsedFrom): array {
                $evidence = in_array($step['required_evidence'] ?? '', ['comment', 'media', 'both'])
                    ? $step['required_evidence'] : 'comment';
                $priority = in_array($step['priority'] ?? '', ['high', 'medium', 'low'])
                    ? $step['priority'] : 'medium';

                return [
                    'sequence_order' => $index + 1,
                    'name' => (string) ($step['name'] ?? 'Step '.($index + 1)),
                    'action' => (string) ($step['action'] ?? ''),
                    'keywords' => array_values(array_filter((array) ($step['keywords'] ?? []), 'is_string')),
                    'required_evidence' => $evidence,
                    'priority' => $priority,
                    'weight' => match ($priority) {
                        'high' => 5,
                        'low' => 1,
                        default => 3,
                    },
                    'min_comment' => $evidence === 'media' ? 0 : 1,
                    'min_media' => in_array($evidence, ['media', 'both']) ? 1 : 0,
                    'expected_column' => isset($step['expected_column']) && is_string($step['expected_column'])
                        ? $step['expected_column'] : null,
                    'is_mandatory' => (bool) ($step['is_mandatory'] ?? true),
                    'parsed_by' => $parsedBy,
                    'parsed_from' => $parsedFrom,
                ];
            })
            ->all();
    }

    /**
     * @return array<int|string, mixed>
     */
    private function decodeJson(string $text): array
    {
        $normalized = trim($text);
        $normalized = preg_replace('/^```json\s*/i', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/^```\s*/', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s*```$/', '', $normalized) ?? $normalized;

        /** @var array<int|string, mixed> $decoded */
        $decoded = json_decode($normalized, true, flags: JSON_THROW_ON_ERROR);

        return $decoded;
    }
}
