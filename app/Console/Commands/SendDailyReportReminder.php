<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Services\KpiNotificationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:kpi-send-report-reminder')]
#[Description('Send daily report reminder (21:00 WITA)')]
class SendDailyReportReminder extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(KpiNotificationService $service): int
    {
        $spvTeam = Team::where('is_spv_team', true)->first();
        if (! $spvTeam) {
            $this->error('No SPV team found');

            return 1;
        }

        $users = $spvTeam->users()->whereNotNull('position_id')->get();

        foreach ($users as $user) {
            $service->sendReportDeadlineReminder($user);
        }

        $this->info('Reminders sent to '.$users->count().' users');

        return 0;
    }
}
