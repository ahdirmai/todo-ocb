<?php

namespace Database\Factories;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KpiTaskDefinition>
 */
class KpiTaskDefinitionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'position_id' => Position::factory(),
            'category' => fake()->randomElement(['Operasional', 'Administrasi', 'Layanan Pelanggan']),
            'task_name' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'work_method' => fake()->paragraph(),
            'verification_method' => fake()->paragraph(),
            'weight' => fake()->randomFloat(2, 5, 30),
            'sequence_order' => fake()->numberBetween(1, 100),
            'is_active' => true,
        ];
    }
}
