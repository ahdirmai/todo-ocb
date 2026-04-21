<?php

use App\Enums\GroupingType;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Document;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function ensureRoles(): void
{
    Role::findOrCreate('member', 'web');
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
}

function createWorkspace(string $name, User $member, string $teamRole = 'member', bool $isActive = true): array
{
    $team = Team::create([
        'name' => $name,
        'slug' => str($name)->slug()->value(),
        'grouping' => GroupingType::TEAM,
        'is_active' => $isActive,
    ]);

    $team->users()->attach($member->id, ['role' => $teamRole]);

    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Main Board',
    ]);

    $todo = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Backlog',
        'order' => 1,
    ]);

    $done = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Done',
        'order' => 2,
    ]);

    return [$team, $todo, $done];
}

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

test('member dashboard shows personal analytics', function () {
    ensureRoles();

    $user = User::factory()->create();
    $user->assignRole('member');

    [$team, $todo, $done] = createWorkspace('Alpha Team', $user);

    $activeTask = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $todo->id,
        'title' => 'Follow up clients',
        'due_date' => now()->addDays(2),
    ]);
    $activeTask->assignees()->attach($user->id);

    $doneTask = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $done->id,
        'title' => 'Archive notes',
        'due_date' => now()->subDay(),
    ]);
    $doneTask->assignees()->attach($user->id);

    ActivityLog::create([
        'log_name' => 'task',
        'event' => 'updated',
        'description' => 'Task moved to review',
        'team_id' => $team->id,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'member')
            ->has('dashboard.stats', 4)
            ->has('dashboard.statusChart')
            ->has('dashboard.teamLoadChart')
            ->has('dashboard.dueSoon', 1)
            ->has('dashboard.teamSnapshots', 1)
            ->has('dashboard.activityFeed')
            ->where('dashboard.dueSoon.0.title', 'Follow up clients'),
        );
});

test('admin dashboard shows operational analytics for active teams', function () {
    ensureRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    [$team, $todo] = createWorkspace('Ops Team', $admin, 'admin');

    $member = User::factory()->create();
    $team->users()->attach($member->id, ['role' => 'member']);

    Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $todo->id,
        'title' => 'Investigate backlog',
        'due_date' => now()->subDay(),
    ]);

    Document::create([
        'team_id' => $team->id,
        'user_id' => $admin->id,
        'name' => 'Runbook',
        'type' => 'document',
    ]);

    Announcement::create([
        'team_id' => $team->id,
        'user_id' => $admin->id,
        'title' => 'Weekly pulse',
        'content' => 'Review open work.',
    ]);

    ActivityLog::create([
        'log_name' => 'team',
        'event' => 'updated',
        'description' => 'Ops team workload increased',
        'team_id' => $team->id,
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'admin')
            ->has('dashboard.stats', 4)
            ->has('dashboard.tasksByTeam')
            ->has('dashboard.tasksByStage')
            ->has('dashboard.activityTrend', 14)
            ->has('dashboard.attentionTeams', 1)
            ->where('dashboard.attentionTeams.0.name', 'Ops Team'),
        );
});

test('superadmin dashboard shows portfolio analytics', function () {
    ensureRoles();

    $superadmin = User::factory()->create();
    $superadmin->assignRole('superadmin');

    [$team] = createWorkspace('HQ Strategy', $superadmin, 'admin');

    TeamMessage::create([
        'team_id' => $team->id,
        'user_id' => $superadmin->id,
        'body' => 'Need visibility on initiatives.',
    ]);

    Document::create([
        'team_id' => $team->id,
        'user_id' => $superadmin->id,
        'name' => 'SOP Dashboard Review',
        'type' => 'document',
        'is_sop' => true,
    ]);

    ActivityLog::create([
        'log_name' => 'member',
        'event' => 'created',
        'description' => 'New admin onboarded',
        'team_id' => $team->id,
    ]);

    $this->actingAs($superadmin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'superadmin')
            ->has('dashboard.portfolioStats', 4)
            ->has('dashboard.groupingBreakdown')
            ->has('dashboard.roleDistribution')
            ->has('dashboard.contentMix')
            ->has('dashboard.attentionTeams'),
        );
});
