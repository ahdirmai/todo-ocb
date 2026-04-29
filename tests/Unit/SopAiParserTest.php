<?php

use App\Services\SopAiParser;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

test('anthropic parser accepts json wrapped in explanatory text', function () {
    config()->set('services.anthropic.api_key', 'test-key');
    config()->set('services.anthropic.base_url', 'https://api.anthropic.com/v1');
    config()->set('services.anthropic.reporting_model', 'claude-test');

    Http::fake([
        'https://api.anthropic.com/v1/messages' => Http::response([
            'content' => [
                [
                    'type' => 'text',
                    'text' => <<<'TEXT'
Berikut hasil ekstraksi SOP:
```json
[
  {
    "name": "Persiapan Lokasi",
    "action": "Siapkan lokasi kerja sebelum mulai eksekusi.",
    "keywords": ["persiapan", "lokasi", "kerja"],
    "required_evidence": "comment",
    "priority": "high",
    "is_mandatory": true
  }
]
```
TEXT,
                ],
            ],
        ]),
    ]);

    $steps = app(SopAiParser::class)->parse([
        'source' => 'text',
        'content' => '1. Siapkan lokasi kerja sebelum mulai eksekusi.',
        'file_path' => null,
    ], [], 'anthropic');

    expect($steps)->toHaveCount(1)
        ->and($steps[0]['name'])->toBe('Persiapan Lokasi')
        ->and($steps[0]['priority'])->toBe('high')
        ->and($steps[0]['parsed_from'])->toBe('text');
});

test('parser throws a specific error when sop has no parseable source', function () {
    expect(fn () => app(SopAiParser::class)->parse([
        'source' => 'none',
        'content' => null,
        'file_path' => null,
    ], [], 'anthropic'))->toThrow(
        RuntimeException::class,
        'Dokumen SOP tidak memiliki konten teks atau file PDF yang bisa diparse.',
    );
});
