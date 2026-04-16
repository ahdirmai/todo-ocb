<?php

namespace Database\Seeders;

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Tag;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;

class MVPSeeder extends Seeder
{
    public function run(): void
    {
        // Call role seeder first
        $this->call(RolePermissionSeeder::class);

        // Create users with roles
        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Admin', 'password' => bcrypt('password')]
        );
        $superadmin->syncRoles('superadmin');

        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Admin User', 'password' => bcrypt('password')]
        );
        $admin->syncRoles('admin');

        $member = User::firstOrCreate(
            ['email' => 'member@example.com'],
            ['name' => 'Regular Member', 'password' => bcrypt('password')]
        );
        $member->syncRoles('member');

        // Seed global Tags
        $tagData = [
            ['name' => 'Design',   'color' => '#3b82f6'],
            ['name' => 'Research', 'color' => '#8b5cf6'],
            ['name' => 'Dev',      'color' => '#f59e0b'],
            ['name' => 'Content',  'color' => '#ec4899'],
            ['name' => 'Bug',      'color' => '#ef4444'],
            ['name' => 'Feature',  'color' => '#10b981'],
        ];

        $tags = [];
        foreach ($tagData as $data) {
            $tags[] = Tag::updateOrCreate(
                ['name' => $data['name']],
                ['color' => $data['color'], 'created_by' => $admin->id]
            );
        }

        // Seed Teams + Kanbans + Tasks
        $teamData = [
            ['name' => 'HR Recruitment', 'grouping' => GroupingType::TEAM,    'slug' => 'hr-recruitment'],
            ['name' => 'Tim Keuangan',   'grouping' => GroupingType::TEAM,    'slug' => 'tim-keuangan'],
            ['name' => 'HQ Internal',    'grouping' => GroupingType::HQ,      'slug' => 'hq-internal'],
            ['name' => 'Proyek Alpha',   'grouping' => GroupingType::PROJECT, 'slug' => 'proyek-alpha'],
        ];

        $columns = ['Backlog', 'In Progress', 'In Review', 'Done'];

        foreach ($teamData as $data) {
            $team = Team::updateOrCreate(['slug' => $data['slug']], $data);

            $team->users()->syncWithoutDetaching([
                $admin->id => ['role' => 'admin'],
                $superadmin->id => ['role' => 'admin'],
                $member->id => ['role' => 'member'],
            ]);

            $kanban = Kanban::updateOrCreate(
                ['team_id' => $team->id],
                ['name' => 'Papan Utama '.$team->name]
            );

            foreach ($columns as $index => $colName) {
                $column = KanbanColumn::updateOrCreate(
                    ['kanban_id' => $kanban->id, 'title' => $colName],
                    ['order' => $index, 'is_default' => true]
                );

                // Add 2 dummy tasks per column
                for ($i = 1; $i <= 2; $i++) {
                    $task = Task::create([
                        'team_id' => $team->id,
                        'kanban_column_id' => $column->id,
                        'title' => "Tugas {$colName} {$i} - {$team->name}",
                        'description' => 'Ini adalah detail tugas dummy.',
                        'due_date' => now()->addDays(rand(1, 14)),
                        'order_position' => $i,
                    ]);

                    // Attach a random tag
                    $task->tags()->attach($tags[array_rand($tags)]->id);
                }
            }
        }
    }
}
