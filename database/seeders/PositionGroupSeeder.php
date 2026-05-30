<?php

namespace Database\Seeders;

use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PositionGroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if already migrated (positions are groups, not specific names)
        $positionCount = Position::count();
        if ($positionCount === 5) {
            $this->command->info('Position groups already exist. Skipping migration.');

            return;
        }

        // Get all users with their current positions before clearing
        $usersData = DB::table('users')
            ->join('positions', 'users.position_id', '=', 'positions.id')
            ->select('users.id', 'positions.name as old_position_name')
            ->get();

        $this->command->info("Found {$usersData->count()} users with positions to migrate.");

        // Clear positions table and reset users
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Position::truncate();
        User::query()->update(['position_id' => null]);
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Create position groups
        $groups = [
            'Direktur' => 'Tingkat Direktur',
            'Manager' => 'Tingkat Manajer',
            'SPV' => 'Supervisor',
            'Staff' => 'Staff / Karyawan',
            'Tim' => 'Anggota Tim',
        ];

        $positions = [];
        $firstUserId = User::orderBy('id')->value('id');

        foreach ($groups as $name => $description) {
            $positions[$name] = Position::create([
                'name' => $name,
                'description' => $description,
                'created_by' => $firstUserId,
            ]);
        }

        // Map users to new groups and set specific position names
        foreach ($usersData as $userData) {
            $oldName = $userData->old_position_name;

            if (! $oldName) {
                continue; // Skip users without position
            }

            $groupKey = $this->determineGroup($oldName);
            $specificName = $oldName; // Keep full name as specific
            $newPositionId = $positions[$groupKey]->id;

            $this->command->info("User {$userData->id}: {$oldName} -> Group: {$groupKey} ({$newPositionId})");

            DB::table('users')->where('id', $userData->id)->update([
                'position_id' => $newPositionId,
                'position' => $specificName,
            ]);
        }
    }

    /**
     * Determine position group from old position name
     */
    private function determineGroup(string $oldName): string
    {
        $oldNameLower = strtolower($oldName);

        if (str_contains($oldNameLower, 'direktur')) {
            return 'Direktur';
        }

        if (str_contains($oldNameLower, 'manajer') || str_contains($oldNameLower, 'manager')) {
            return 'Manager';
        }

        if (str_contains($oldNameLower, 'spv') || str_contains($oldNameLower, 'supervisor')) {
            return 'SPV';
        }

        if (str_contains($oldNameLower, 'tim ') || str_contains($oldNameLower, 'team')) {
            return 'Tim';
        }

        // Default to Staff for: CS, Gudang, Staf, Trainer, etc.
        return 'Staff';
    }
}
