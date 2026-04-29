<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\DocumentSopStepSyncService;
use App\Services\SopAiParser;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ParseTeamSopJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 180;

    public int $tries = 1;

    public function __construct(
        public readonly string $documentId,
        public readonly string $platform,
    ) {}

    public function handle(
        SopAiParser $parser,
        DocumentSopStepSyncService $syncService,
    ): void {
        $document = Document::query()
            ->with('team')
            ->find($this->documentId);

        if (! $document || ! $document->is_sop) {
            return;
        }

        $document->forceFill([
            'sop_parse_status' => 'processing',
            'sop_parse_platform' => $this->platform,
            'sop_parse_error' => null,
            'sop_parse_started_at' => now(),
        ])->save();

        try {
            $aiReadableContent = $document->getAiReadableContent();

            $steps = $parser->parse(
                $aiReadableContent,
                [],
                $this->platform,
            );

            $syncService->replace($document, $steps);

            $document->forceFill([
                'sop_parse_status' => 'completed',
                'sop_parse_error' => null,
                'sop_parse_completed_at' => now(),
            ])->save();
        } catch (Throwable $exception) {
            $document->forceFill([
                'sop_parse_status' => 'failed',
                'sop_parse_error' => mb_substr($exception->getMessage(), 0, 65535),
                'sop_parse_completed_at' => now(),
            ])->save();

            throw $exception;
        }
    }
}
