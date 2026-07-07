<?php

namespace App\Services;

use App\Models\KpiTaskDefinition;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use JsonException;
use RuntimeException;
use Throwable;

/**
 * Scores how well a user's evidence comment matches a KPI task definition using
 * the OpenAI Responses API with a strict JSON schema. Returns a 0–100
 * compliance score plus a short Indonesian feedback string.
 */
class AiTaskCheckService
{
    /**
     * @return array{score: float, feedback: string}
     */
    public function scoreCompliance(KpiTaskDefinition $definition, string $commentText): array
    {
        $apiKey = (string) config('services.openai.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi OpenAI belum lengkap.');
        }

        try {
            $response = Http::baseUrl($this->baseUrl())
                ->acceptJson()
                ->asJson()
                ->withToken($apiKey)
                ->connectTimeout(15)
                ->timeout(60)
                ->retry([250, 750], fn (Throwable $exception, PendingRequest $request): bool => $this->shouldRetry($exception), throw: false)
                ->post('responses', [
                    'model' => (string) config('services.openai.task_check_model', 'gpt-5.5-nano'),
                    'input' => [
                        [
                            'role' => 'system',
                            'content' => $this->systemPrompt(),
                        ],
                        [
                            'role' => 'user',
                            'content' => $this->userPrompt($definition, $commentText),
                        ],
                    ],
                    'text' => [
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'task_compliance',
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
                throw new RuntimeException('OpenAI tidak mengembalikan hasil penilaian yang valid.');
            }

            /** @var array{score?: mixed, feedback?: mixed} $decoded */
            $decoded = json_decode((string) $outputText['text'], true, flags: JSON_THROW_ON_ERROR);

            $score = (float) ($decoded['score'] ?? 0);
            $score = max(0.0, min(100.0, $score));

            return [
                'score' => $score,
                'feedback' => (string) ($decoded['feedback'] ?? ''),
            ];
        } catch (RequestException|ConnectionException|JsonException $exception) {
            throw new RuntimeException(
                'Gagal menilai kesesuaian task melalui OpenAI: '.$exception->getMessage(),
                previous: $exception,
            );
        }
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
Anda adalah auditor KPI operasional yang menilai bukti pengerjaan task.

ATURAN PENTING: Jika sudah ada komentar DAN foto/attachment, skor baseline adalah
70. Anda hanya perlu memberi tambahan 0–30 berdasarkan analisa konten komentar.

Alur penilaian:
1. Cek apakah bukti punya komentar + foto/attachment.
   - Jika YA → baseline = 70, Anda beri tambahan 0–30 untuk konten.
   - Jika TIDAK → baseline = 0, Anda beri skor 0–30.

2. Analisa konten komentar terhadap work_method dan verification_method:
   - 0–10  = komentar tidak menjelaskan cara kerja / asal tempel.
   - 11–20 = komentar menjelaskan sebagian cara kerja.
   - 21–30 = komentar menjelaskan dengan jelas sesuai cara kerja & verifikasi.

3. Skor total = baseline + tambahan konten.

Balas HANYA JSON valid sesuai schema:
{"score": <tambahan konten 0-30>, "feedback": "<alasan singkat Bahasa Indonesia, 1-2 kalimat>"}.
Jangan menambah narasi lain.
PROMPT;
    }

    private function userPrompt(KpiTaskDefinition $definition, string $commentText): string
    {
        $payload = [
            'definisi_task' => [
                'task_name' => $definition->task_name,
                'description' => $definition->description,
                'work_method' => $definition->work_method,
                'verification_method' => $definition->verification_method,
            ],
            'bukti_komentar_user' => $commentText,
        ];

        return "Nilai kesesuaian bukti berikut dengan definisi task.\n"
            .json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
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
                'score' => [
                    'type' => 'number',
                    'minimum' => 0,
                    'maximum' => 100,
                ],
                'feedback' => [
                    'type' => 'string',
                ],
            ],
            'required' => ['score', 'feedback'],
        ];
    }

    private function baseUrl(): string
    {
        $configuredUrl = (string) config('services.openai.base_url', 'https://api.openai.com/v1');
        $host = Str::lower((string) parse_url($configuredUrl, PHP_URL_HOST));

        if ($host !== 'api.openai.com') {
            throw new RuntimeException('Konfigurasi endpoint OpenAI tidak valid.');
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
}
