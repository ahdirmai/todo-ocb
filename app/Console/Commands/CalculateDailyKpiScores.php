<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Services\KpiScoringService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('app:kpi-calculate-daily-scores {--date=}')]
#[Description('Calculate daily KPI scores for all users')]
class CalculateDailyKpiScores extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(KpiScoringService $service): int
    {
        $date = $this->option('date') ? Carbon::parse($this->option('date')) : now();
        $spvTeam = Team::where('is_spv_team', true)->first();

        if (! $spvTeam) {
            $this->error('No SPV team found');

            return 1;
        }

        $users = $spvTeam->users()->whereNotNull('position_id')->get();

        foreach ($users as $user) {
            try {
                $score = $service->calculateDailyScore($user, $date);
                $this->info("Calculated score for {$user->name}: {$score->total_score}% ({$score->grade})");
            } catch (\Exception $e) {
                $this->warn("Failed for {$user->name}: {$e->getMessage()}");
            }
        }

        return 0;
    }
}
