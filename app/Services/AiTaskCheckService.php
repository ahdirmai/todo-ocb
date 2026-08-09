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
        $provider = (string) config('services.openai.task_check_provider', 'openai');

        if ($provider === '9route') {
            return $this->scoreVia9Route($definition, $commentText);
        }

        return $this->scoreViaOpenAi($definition, $commentText);
    }

    /**
     * @return array{score: float, feedback: string}
     */
    private function scoreViaOpenAi(KpiTaskDefinition $definition, string $commentText): array
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

    /**
     * Score via the local 9Route gateway using the OpenAI-compatible
     * Chat Completions endpoint (Responses API is not supported there).
     *
     * @return array{score: float, feedback: string}
     */
    private function scoreVia9Route(KpiTaskDefinition $definition, string $commentText): array
    {
        $apiKey = (string) config('services.9route.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Konfigurasi 9Route belum lengkap.');
        }

        $baseUrl = rtrim((string) config('services.9route.base_url', 'http://localhost:20128/v1'), '/').'/';

        try {
            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->asJson()
                ->withToken($apiKey)
                ->connectTimeout(15)
                ->timeout(60)
                ->retry([250, 750], fn (Throwable $exception, PendingRequest $request): bool => $this->shouldRetry($exception), throw: false)
                ->post('chat/completions', [
                    'model' => (string) config('services.9route.task_check_model', 'claude-haikyu'),
                    'stream' => false,
                    'temperature' => 0.1,
                    'max_tokens' => 500,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $this->systemPrompt(),
                        ],
                        [
                            'role' => 'user',
                            'content' => $this->userPrompt($definition, $commentText),
                        ],
                    ],
                ]);

            $response->throw();

            $text = data_get($response->json(), 'choices.0.message.content');

            if (! is_string($text) || trim($text) === '') {
                throw new RuntimeException('9Route tidak mengembalikan hasil penilaian yang valid.');
            }

            /** @var array{score?: mixed, feedback?: mixed} $decoded */
            $decoded = json_decode($this->stripJsonFence($text), true, flags: JSON_THROW_ON_ERROR);

            $score = (float) ($decoded['score'] ?? 0);
            $score = max(0.0, min(100.0, $score));

            return [
                'score' => $score,
                'feedback' => (string) ($decoded['feedback'] ?? ''),
            ];
        } catch (RequestException|ConnectionException|JsonException $exception) {
            throw new RuntimeException(
                'Gagal menilai kesesuaian task melalui 9Route: '.$exception->getMessage(),
                previous: $exception,
            );
        }
    }

    /**
     * Some models wrap JSON in a ```json ... ``` markdown fence despite the
     * response_format hint. Strip it before decoding.
     */
    private function stripJsonFence(string $text): string
    {
        $trimmed = trim($text);
        $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed);
        $trimmed = preg_replace('/\s*```$/', '', (string) $trimmed);

        return trim((string) $trimmed);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
Anda adalah auditor KPI operasional yang menilai bukti pengerjaan task.

Tugas Anda: nilai seberapa sesuai bukti komentar user dengan work_method dan
verification_method pada definisi task, lalu beri SATU skor akhir 0–100.

Prinsip penilaian (bersikap SANGAT murah hati / longgar):
- Bila komentar sudah menyinggung pekerjaan sesuai panduan, beri skor tinggi.
  Bukti yang jelas & sesuai HARUS mudah meraih 90–100. Jangan pelit.
- Jangan menuntut kata kunci persis, detail lengkap, atau kalimat panjang.
  Selama inti pekerjaan nyambung dengan cara kerja & cara verifikasi, itu sudah
  "sesuai" dan layak diterima. Ragu-ragu → condong MENERIMA.

Rubrik skor akhir 0–100:
- 90–100 = bukti menjelaskan cara kerja DAN sesuai metode verifikasi.
- 75–89  = inti pekerjaan sesuai panduan, ada kekurangan kecil (tetap diterima).
- 55–74  = kurang menjelaskan cara kerja / verifikasi (belum diterima, minta perbaikan).
- 0–54   = tidak sesuai, tidak relevan, atau asal tempel (ditolak).

Ambang lulus ada di sisi sistem (>= 75 = diterima). Fokus Anda: beri skor jujur
sesuai rubrik, tapi condong longgar. Jika ditolak (< 75), feedback WAJIB menyebut
apa yang perlu diperbaiki secara spesifik.

Balas HANYA JSON valid sesuai schema:
{"score": <0-100>, "feedback": "<alasan singkat Bahasa Indonesia, 1-2 kalimat>"}.
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
