<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Services\KpiTaskGenerationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:kpi-generate-daily-tasks')]
#[Description('Generate daily KPI tasks from templates for SPV team members')]
class GenerateDailyKpiTasks extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(KpiTaskGenerationService $service): int
    {
        $spvTeam = Team::where('is_spv_team', true)->first();
        if (! $spvTeam) {
            $this->error('No SPV team found');

            return 1;
        }

        $service->generateDailyTasksForTeam($spvTeam, now());
        $this->info('Daily KPI tasks generated successfully');

        return 0;
    }
}
