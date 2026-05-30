<?php

namespace App\Services;

use App\Models\KpiTaskDefinition;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class KpiTaskGenerationService
{
    public function generateDailyTasksForTeam(Team $spvTeam, CarbonInterface $date): void
    {
        if (! $spvTeam->is_spv_team) {
            throw new \Exception('Team must be SPV team');
        }

        $users = $spvTeam->users()->whereNotNull('position_id')->get();

        foreach ($users as $user) {
            $this->generateDailyTasksForUser($user, $date, $spvTeam);
        }
    }

    public function generateDailyTasksForUser(User $user, CarbonInterface $date, ?Team $spvTeam = null): Collection
    {
        if (! $user->position_id) {
            throw new \Exception('User must have position');
        }

        if (! $spvTeam) {
            $spvTeam = $user->teams()->where('is_spv_team', true)->first();
        }

        if (! $spvTeam) {
            throw new \Exception('User must be in SPV team');
        }

        $kanban = $spvTeam->kanbans()->first();
        if (! $kanban) {
            throw new \Exception('SPV team must have kanban');
        }

        $firstColumn = $kanban->columns()->orderBy('order')->first();
        if (! $firstColumn) {
            throw new \Exception('Kanban must have at least one column');
        }

        $definitions = $this->getActiveDefinitionsForPosition($user->position_id);

        $tasks = collect();
        $order = 0;

        foreach ($definitions as $definition) {
            $existingTask = Task::where('is_kpi_task', true)
                ->where('kpi_task_definition_id', $definition->id)
                ->where('team_id', $spvTeam->id)
                ->whereDate('created_at', $date->toDateString())
                ->first();

            if ($existingTask) {
                $tasks->push($existingTask);

                continue;
            }

            $task = Task::create([
                'team_id' => $spvTeam->id,
                'kanban_column_id' => $firstColumn->id,
                'kpi_task_definition_id' => $definition->id,
                'is_kpi_task' => true,
                'title' => "[{$definition->category}] {$definition->task_name}",
                'description' => $this->buildTaskDescription($definition),
                'due_date' => $date->endOfDay(),
                'order_position' => $order++,
                'creator_id' => $user->id,
            ]);

            $task->assignees()->attach($user->id);

            $tasks->push($task);
        }

        return $tasks;
    }

    public function getActiveDefinitionsForPosition(string $positionId): Collection
    {
        return KpiTaskDefinition::where('position_id', $positionId)
            ->where('is_active', true)
            ->orderBy('sequence_order')
            ->get();
    }

    protected function buildTaskDescription(KpiTaskDefinition $definition): string
    {
        $parts = [];

        if ($definition->description) {
            $parts[] = $definition->description;
        }

        if ($definition->work_method) {
            $parts[] = "\n**Cara Kerja:**\n{$definition->work_method}";
        }

        if ($definition->verification_method) {
            $parts[] = "\n**Cara Verifikasi:**\n{$definition->verification_method}";
        }

        $parts[] = "\n**Bobot:** {$definition->weight}%";

        return implode("\n", array_filter($parts));
    }
}
