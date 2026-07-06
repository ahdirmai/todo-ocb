<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\User;
use App\Services\KpiTaskGenerationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:kpi-generate-daily-tasks')]
#[Description('Generate daily KPI tasks from templates for SPV team members and all KPI-enabled positions')]
class GenerateDailyKpiTasks extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(KpiTaskGenerationService $service): int
    {
        $date = now();

        // 1. Generate untuk SPV team members (mode lama, fallback)
        $spvTeam = Team::where('is_spv_team', true)->first();
        if ($spvTeam) {
            $service->generateDailyTasksForTeam($spvTeam, $date);
            $this->info('Daily KPI tasks generated for SPV team');
        }

        // 2. Generate untuk semua user dengan posisi yang punya KPI enabled
        //    (Manager HR/Ops, Manager Gudang, 5 line gudang, atau posisi baru
        //    yang ditambahkan dengan has_kpi=true)
        $managerUsers = User::query()
            ->whereNotNull('position_id')
            ->whereHas('jobPosition', fn ($q) => $q->kpiEnabled())
            ->get();

        foreach ($managerUsers as $user) {
            try {
                $service->generateDailyTasksForUser($user, $date, null);
                $this->info("Generated KPI tasks for {$user->name}");
            } catch (\Exception $e) {
                $this->warn("Failed for {$user->name}: {$e->getMessage()}");
            }
        }

        return 0;
    }
}
