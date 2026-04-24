<?php

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('deleting a task removes the taskId query parameter from the redirect target', function () {
    [$team, $column] = createTaskDeleteWorkspace();
    $owner = User::factory()->create();

    $team->users()->attach($owner->id, ['role' => 'member']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Task yang dibuka dari deep link',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);

    $response = $this
        ->actingAs($owner)
        ->from("/teams/{$team->slug}/task?taskId={$task->id}")
        ->delete(route('tasks.destroy', $task));

    $response->assertRedirect("/teams/{$team->slug}/task");
    $this->assertModelMissing($task);
});

function createTaskDeleteWorkspace(): array
{
    $team = Team::create([
        'name' => 'Task Delete Ops',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Board Task',
    ]);

    $column = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'To Do',
        'order' => 0,
        'is_default' => true,
    ]);

    return [$team, $column];
}
