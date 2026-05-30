<?php

namespace Database\Factories;

use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'branch_code' => 'OC'.fake()->unique()->numberBetween(1, 999),
            'name' => fake()->randomElement(['OSCAR CELL', 'AL RAIS CELL', 'ARFA CELL', 'SULAIMAN CELL', 'PONSEL SAYANG', 'SERENA CELL']),
            'address' => fake()->address(),
        ];
    }
}
