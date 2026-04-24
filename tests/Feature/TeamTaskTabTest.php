<?php

use App\Enums\GroupingType;
use App\Models\Comment;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('team task tab includes comment counts for kanban tasks', function () {
    $user = User::factory()->create();

    $team = Team::create([
        'name' => 'Delivery Team',
        'slug' => 'delivery-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $team->users()->attach($user->id, ['role' => 'member']);

    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Main Board',
    ]);

    $column = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Backlog',
        'order' => 0,
        'is_default' => true,
    ]);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Review kanban card',
        'creator_id' => $user->id,
        'order_position' => 0,
    ]);

    Comment::factory()->count(2)->create([
        'task_id' => $task->id,
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get(route('teams.show', [
            'team' => $team->slug,
            'tab' => 'task',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teams/show')
            ->where('tab', 'task')
            ->where('team.kanbans.0.columns.0.tasks.0.comments_count', 2)
            ->where('team.kanbans.0.columns.0.tasks.0.media_count', 0)
        );
});
