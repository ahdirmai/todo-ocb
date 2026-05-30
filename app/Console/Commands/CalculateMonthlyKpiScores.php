<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Services\KpiScoringService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('app:kpi-calculate-monthly-scores {--month=}')]
#[Description('Calculate monthly KPI scores with consistency bonus')]
class CalculateMonthlyKpiScores extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(KpiScoringService $service): int
    {
        $month = $this->option('month') ? Carbon::parse($this->option('month')) : now();
        $month = $month->startOfMonth();

        $spvTeam = Team::where('is_spv_team', true)->first();
        if (! $spvTeam) {
            $this->error('No SPV team found');

            return 1;
        }

        $users = $spvTeam->users()->whereNotNull('position_id')->get();

        foreach ($users as $user) {
            try {
                $score = $service->calculateMonthlyScore($user, $month);
                $this->info("Monthly score for {$user->name}: {$score->final_score}% ({$score->grade}) [bonus: {$score->consistency_bonus}]");
            } catch (\Exception $e) {
                $this->warn("Failed for {$user->name}: {$e->getMessage()}");
            }
        }

        return 0;
    }
}
