<?php

namespace App\Console\Commands;

use App\Jobs\ProcessRecurringAnnouncementReminder;
use App\Models\Announcement;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:dispatch-recurring-announcements')]
#[Description('Dispatch recurring announcement reminders')]
class DispatchRecurringAnnouncements extends Command
{
    public function handle(): int
    {
        $now = now();

        $announcements = Announcement::query()
            ->where('is_recurring', true)
            ->whereNull('source_announcement_id')
            ->whereNotNull('next_occurrence_at')
            ->where('next_occurrence_at', '<=', $now)
            ->get();

        $dispatchedCount = 0;

        foreach ($announcements as $announcement) {
            ProcessRecurringAnnouncementReminder::dispatch($announcement->id);
            $dispatchedCount++;
        }

        $this->info("Queued {$dispatchedCount} recurring announcement reminder job(s).");

        return self::SUCCESS;
    }
}
