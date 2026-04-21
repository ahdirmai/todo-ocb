<?php

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('task owner can update task title', function () {
    [$team, $column] = createTaskWorkspace();
    $owner = User::factory()->create();

    $team->users()->attach($owner->id, ['role' => 'member']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Judul Lama',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);

    $response = $this->actingAs($owner)->put(route('tasks.update', $task), [
        'title' => 'Judul Baru',
    ]);

    $response->assertSessionHasNoErrors();
    expect($task->fresh()->title)->toBe('Judul Baru');
});

test('team admin can update task title', function () {
    [$team, $column] = createTaskWorkspace();
    $owner = User::factory()->create();
    $teamAdmin = User::factory()->create();

    $team->users()->attach($owner->id, ['role' => 'member']);
    $team->users()->attach($teamAdmin->id, ['role' => 'admin']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Judul Lama',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);

    $response = $this->actingAs($teamAdmin)->put(route('tasks.update', $task), [
        'title' => 'Judul Admin',
    ]);

    $response->assertSessionHasNoErrors();
    expect($task->fresh()->title)->toBe('Judul Admin');
});

test('assignee who is not the owner or admin can update task title', function () {
    [$team, $column] = createTaskWorkspace();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();

    $team->users()->attach($owner->id, ['role' => 'member']);
    $team->users()->attach($assignee->id, ['role' => 'member']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Judul Lama',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);

    $task->assignees()->attach($assignee->id);

    $response = $this->actingAs($assignee)->put(route('tasks.update', $task), [
        'title' => 'Judul Assignee',
    ]);

    $response->assertSessionHasNoErrors();
    expect($task->fresh()->title)->toBe('Judul Assignee');
});

test('assignee who is not the owner or admin cannot delete task', function () {
    [$team, $column] = createTaskWorkspace();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();

    $team->users()->attach($owner->id, ['role' => 'member']);
    $team->users()->attach($assignee->id, ['role' => 'member']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Judul Lama',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);

    $task->assignees()->attach($assignee->id);

    $response = $this->actingAs($assignee)->delete(route('tasks.destroy', $task));

    $response->assertForbidden();
    expect(Task::query()->whereKey($task->id)->exists())->toBeTrue();
});

function createTaskWorkspace(): array
{
    $team = Team::create([
        'name' => 'Task Ops',
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
