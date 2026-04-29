<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use JsonException;
use RuntimeException;
use Throwable;

class AiReportingService
{
    public function generateMonthlyTaskNarrative(array $sourceSnapshot, string $platform): array
    {
        return match ($platform) {
            'openai' => $this->generateWithOpenAi($sourceSnapshot),
            'anthropic' => $this->generateWithAnthropic($sourceSnapshot),
            'gemini' => $this->generateWithGemini($sourceSnapshot),
            default => throw new RuntimeException('Platform AI tidak dikenali: '.$platform),
        };
    }

    public function model(string $platform): string
    {
        return match ($platform) {
            'openai' => (string) config('services.openai.reporting_model', 'gpt-5-mini'),
            'anthropic' => (string) config('services.anthropic.reporting_model', 'claude-sonnet-4-20250514'),
            'gemini' => (string) config('services.gemini.reporting_model', 'gemini-2.5-flash'),
            default => throw new RuntimeException('Platform AI tidak dikenali: '.$platform),
        };
    }

    public function platforms(): array
    {
        return collect([
            ['value' => 'openai', 'label' => 'ChatGPT', 'configured' => filled(config('services.openai.api_key'))],
            ['value' => 'anthropic', 'label' => 'Claude', 'configured' => filled(config('services.anthropic.api_key'))],
            ['value' => 'gemini', 'label' => 'Gemini', 'configured' => filled(config('services.gemini.api_key'))],
        ])
            ->where('configured', true)
            ->map(fn (array $platform): array => [
                'value' => $platform['value'],
                'label' => $platform['label'],
            ])
            ->values()
            ->all();
    }

    private function generateWithOpenAi(array $sourceSnapshot): array
    {
        $apiKey = (string) config('services.openai.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi OpenAI belum lengkap.');
        }

        try {
            $response = Http::baseUrl($this->baseUrl('openai'))
                ->acceptJson()
                ->asJson()
                ->withToken($apiKey)
                ->connectTimeout(15)
                ->timeout(180)
                ->retry([250, 750], fn (Throwable $exception, PendingRequest $request): bool => $this->shouldRetry($exception), throw: false)
                ->post('responses', [
                    'model' => $this->model('openai'),
                    'input' => [
                        [
                            'role' => 'system',
                            'content' => $this->systemPrompt(),
                        ],
                        [
                            'role' => 'user',
                            'content' => json_encode($sourceSnapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                        ],
                    ],
                    'text' => [
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'monthly_task_report',
                            'schema' => $this->schema(),
                            'strict' => true,
                        ],
                    ],
                ]);

            $response->throw();

            $outputText = collect($response->json('output', []))
                ->where('type', 'message')
                ->flatMap(fn (array $message): array => Arr::wrap($message['content'] ?? []))
                ->firstWhere('type', 'output_text');

            if (! is_array($outputText) || ! isset($outputText['text'])) {
                $refusal = collect($response->json('output', []))
                    ->where('type', 'message')
                    ->flatMap(fn (array $message): array => Arr::wrap($message['content'] ?? []))
                    ->firstWhere('type', 'refusal');

                if (is_array($refusal) && isset($refusal['refusal'])) {
                    throw new RuntimeException('OpenAI menolak menghasilkan report: '.$refusal['refusal']);
                }

                throw new RuntimeException('OpenAI tidak mengembalikan output report yang valid.');
            }

            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($outputText['text'], true, flags: JSON_THROW_ON_ERROR);

            return $decoded;
        } catch (RequestException|ConnectionException|JsonException $exception) {
            throw new RuntimeException(
                'Gagal menghasilkan report melalui OpenAI: '.$exception->getMessage(),
                previous: $exception,
            );
        }
    }

    private function generateWithAnthropic(array $sourceSnapshot): array
    {
        $apiKey = (string) config('services.anthropic.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi Claude belum lengkap.');
        }

        try {
            $response = Http::baseUrl($this->baseUrl('anthropic'))
                ->acceptJson()
                ->asJson()
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => (string) config('services.anthropic.version', '2023-06-01'),
                ])
                ->connectTimeout(15)
                ->timeout(180)
                ->retry([250, 750], fn (Throwable $exception, PendingRequest $request): bool => $this->shouldRetry($exception), throw: false)
                ->post('messages', [
                    'model' => $this->model('anthropic'),
                    'max_tokens' => 4096,
                    'system' => $this->systemPrompt(),
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => $this->jsonModePrompt($sourceSnapshot),
                        ],
                    ],
                ]);

            $response->throw();

            $text = data_get($response->json(), 'content.0.text');

            if (! is_string($text) || $text === '') {
                throw new RuntimeException('Claude tidak mengembalikan text report yang valid.');
            }

            return $this->decodeJsonText($text);
        } catch (RequestException|ConnectionException|JsonException $exception) {
            throw new RuntimeException(
                'Gagal menghasilkan report melalui Claude: '.$exception->getMessage(),
                previous: $exception,
            );
        }
    }

    private function generateWithGemini(array $sourceSnapshot): array
    {
        $apiKey = (string) config('services.gemini.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi Gemini belum lengkap.');
        }

        try {
            $response = Http::baseUrl($this->baseUrl('gemini'))
                ->acceptJson()
                ->asJson()
                ->withHeaders([
                    'x-goog-api-key' => $apiKey,
                ])
                ->connectTimeout(15)
                ->timeout(180)
                ->retry([250, 750], fn (Throwable $exception, PendingRequest $request): bool => $this->shouldRetry($exception), throw: false)
                ->post('models/'.$this->model('gemini').':generateContent', [
                    'contents' => [
                        [
                            'parts' => [
                                [
                                    'text' => $this->systemPrompt()."\n\n".$this->jsonModePrompt($sourceSnapshot),
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                    ],
                ]);

            $response->throw();

            $text = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (! is_string($text) || $text === '') {
                throw new RuntimeException('Gemini tidak mengembalikan text report yang valid.');
            }

            return $this->decodeJsonText($text);
        } catch (RequestException|ConnectionException|JsonException $exception) {
            throw new RuntimeException(
                'Gagal menghasilkan report melalui Gemini: '.$exception->getMessage(),
                previous: $exception,
            );
        }
    }

    private function baseUrl(string $platform): string
    {
        $configuredUrl = match ($platform) {
            'openai' => (string) config('services.openai.base_url', 'https://api.openai.com/v1'),
            'anthropic' => (string) config('services.anthropic.base_url', 'https://api.anthropic.com/v1'),
            'gemini' => (string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta'),
            default => throw new RuntimeException('Platform AI tidak dikenali: '.$platform),
        };

        $host = Str::lower((string) parse_url($configuredUrl, PHP_URL_HOST));

        $allowedHosts = match ($platform) {
            'openai' => ['api.openai.com'],
            'anthropic' => ['api.anthropic.com'],
            'gemini' => ['generativelanguage.googleapis.com'],
            default => [],
        };

        if (! in_array($host, $allowedHosts, true)) {
            throw new RuntimeException('Konfigurasi endpoint '.$platform.' tidak valid.');
        }

        return rtrim($configuredUrl, '/').'/';
    }

    private function shouldRetry(Throwable $exception): bool
    {
        if ($exception instanceof ConnectionException) {
            return true;
        }

        return $exception instanceof RequestException
            && $exception->response !== null
            && $exception->response->serverError();
    }

    private function decodeJsonText(string $text): array
    {
        $normalized = trim($text);
        $normalized = preg_replace('/^```json\s*/', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/^```\s*/', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s*```$/', '', $normalized) ?? $normalized;

        /** @var array<string, mixed> $decoded */
        $decoded = json_decode($normalized, true, flags: JSON_THROW_ON_ERROR);

        return $decoded;
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
Anda adalah auditor KPI operasional.

Tugas Anda: Menilai setiap task dari setiap anggota secara objektif berdasarkan SOP team.
Lakukan penilaian task untuk SETIAP jalur SOP yang ada di `audit_steps` tim tersebut.

Aturan scoring per JALUR SOP (0, 3, 6, atau 10):
- `10` = Task memenuhi kriteria jalur ini secara penuh (ada komentar/bukti kuat dan attachment jika diperlukan).
- `6`  = Task memenuhi kriteria sebagian (contoh: status sesuai tapi attachment kurang lengkap).
- `3`  = Status/Log menunjukkan ada progres terkait jalur ini, tapi bukti/komentar minimal.
- `0`  = Tidak ada indikasi sama sekali bahwa jalur SOP ini dilakukan.

Aturan output:
- `breakdown_task` wajib diisi untuk tiap task milik member.
- Di dalam `breakdown_task`, `breakdown_jalur` wajib berisi SEMUA langkah SOP yang ada di `audit_steps` (satu objek per langkah/jalur SOP).
- Jika SOP tidak ada, `breakdown_jalur` dapat dibiarkan kosong, skor 0.
- `skor_total_task` adalah jumlah seluruh `skor` dari `breakdown_jalur`.
- `compliance_persen` adalah (skor_total / skor_maksimal) * 100. Skor maksimal = jumlah jalur SOP * 10.
- `quality` adalah kesimpulan singkat 1 kalimat ttg kualitas task ini.
- `performance_label` member: `excellent` (rata2 compliance > 80%), `good` (> 60%), `watch` (> 40%), `critical` (< 40%).
- HINDARI NARATIF PANJANG. Kembalikan JSON valid murni sesuai schema.
PROMPT;
    }

    private function jsonModePrompt(array $sourceSnapshot): string
    {
        return "Gunakan schema berikut sebagai bentuk output.\n"
            ."PENTING: selaraskan analisis dengan metodologi skill audit KPI dan SPV yang memakai SOP team, jalur Kanban, dan evidence comments/attachments.\n"
            .$this->schemaAsJson()
            ."\n\nData sumber:\n"
            .json_encode($sourceSnapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    private function schemaAsJson(): string
    {
        return json_encode($this->schema(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'overview' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'properties' => [
                        'headline' => ['type' => 'string'],
                        'summary' => ['type' => 'string'],
                    ],
                    'required' => ['headline', 'summary'],
                ],
                'teams' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'team_id' => ['type' => 'string'],
                            'members' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'additionalProperties' => false,
                                    'properties' => [
                                        'member_key' => ['type' => 'string'],
                                        'compliance_persen' => ['type' => 'string'],
                                        'performance_label' => [
                                            'type' => 'string',
                                            'enum' => ['excellent', 'good', 'watch', 'critical'],
                                        ],
                                        'breakdown_task' => [
                                            'type' => 'array',
                                            'items' => [
                                                'type' => 'object',
                                                'additionalProperties' => false,
                                                'properties' => [
                                                    'task_id' => ['type' => 'string'],
                                                    'skor_total_task' => ['type' => 'integer'],
                                                    'compliance_persen' => ['type' => 'string'],
                                                    'quality' => ['type' => 'string'],
                                                    'breakdown_jalur' => [
                                                        'type' => 'array',
                                                        'items' => [
                                                            'type' => 'object',
                                                            'additionalProperties' => false,
                                                            'properties' => [
                                                                'nama_jalur' => ['type' => 'string'],
                                                                'skor' => ['type' => 'integer', 'enum' => [0, 3, 6, 10]],
                                                                'penjelasan' => ['type' => 'string'],
                                                            ],
                                                            'required' => ['nama_jalur', 'skor', 'penjelasan'],
                                                        ],
                                                    ],
                                                ],
                                                'required' => ['task_id', 'skor_total_task', 'compliance_persen', 'quality', 'breakdown_jalur'],
                                            ],
                                        ],
                                    ],
                                    'required' => ['member_key', 'compliance_persen', 'performance_label', 'breakdown_task'],
                                ],
                            ],
                        ],
                        'required' => ['team_id', 'members'],
                    ],
                ],
            ],
            'required' => ['overview', 'teams'],
        ];
    }
}
