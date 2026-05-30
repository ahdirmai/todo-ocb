<?php

namespace App\Services;

use App\Models\KpiDailyScore;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class KpiNotificationService
{
    public function sendDailyTaskReminder(User $user): void
    {
        Log::info("KPI: Daily task reminder sent to user {$user->id}");
    }

    public function sendReportDeadlineReminder(User $user): void
    {
        Log::info("KPI: Report deadline reminder (21:00 WITA) sent to user {$user->id}");
    }

    public function sendGradeDAlert(User $user, KpiDailyScore $score): void
    {
        Log::warning("KPI: Grade D alert for user {$user->id} on {$score->score_date}. Score: {$score->total_score}%");
    }

    public function sendLateReportAlert(User $user): void
    {
        Log::warning("KPI: Late report submission alert for user {$user->id}");
    }
}
