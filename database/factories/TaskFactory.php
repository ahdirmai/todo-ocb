<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'kanban_column_id' => null,
            'store_id' => null,
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'due_date' => null,
            'visit_date' => null,
            'order_position' => 0,
            'creator_id' => null,
            'kpi_task_definition_id' => null,
            'is_kpi_task' => false,
            'is_verified' => false,
            'verified_at' => null,
        ];
    }
}
