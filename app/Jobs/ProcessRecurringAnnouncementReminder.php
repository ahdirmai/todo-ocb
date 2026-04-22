<?php

namespace App\Jobs;

use App\Models\Announcement;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessRecurringAnnouncementReminder implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $uniqueFor = 300;

    public function __construct(public string $announcementId)
    {
        $this->onQueue('default');
    }

    public function uniqueId(): string
    {
        return $this->announcementId;
    }

    public function handle(): void
    {
        DB::transaction(function (): void {
            $announcement = Announcement::query()
                ->with('media')
                ->lockForUpdate()
                ->find($this->announcementId);

            if (! $announcement?->isRecurringTemplate() || ! $announcement->next_occurrence_at) {
                return;
            }

            $now = now();
            $nextOccurrence = $announcement->next_occurrence_at;

            if ($nextOccurrence->gt($now)) {
                return;
            }

            while ($nextOccurrence && $nextOccurrence->lte($now)) {
                $reminder = Announcement::create([
                    'team_id' => $announcement->team_id,
                    'user_id' => $announcement->user_id,
                    'source_announcement_id' => $announcement->id,
                    'title' => $announcement->title,
                    'content' => $announcement->content,
                    'is_recurring' => false,
                ]);

                foreach ($announcement->getMedia('attachments') as $media) {
                    $media->copy($reminder, 'attachments');
                }

                $nextOccurrence = $announcement->calculateNextOccurrence($nextOccurrence);
            }

            $announcement->update([
                'next_occurrence_at' => $nextOccurrence,
                'last_generated_at' => $now,
            ]);
        });
    }
}
