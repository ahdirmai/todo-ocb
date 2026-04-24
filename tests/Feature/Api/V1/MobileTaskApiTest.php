<?php

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('team member can create update and delete task through mobile api', function () {
    $user = User::factory()->create();
    [$team, $column] = createMobileTaskWorkspace();
    $team->users()->attach($user->id, ['role' => 'member']);

    Sanctum::actingAs($user);

    $createResponse = $this->postJson('/api/v1/tasks', [
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Task Mobile',
        'description' => 'Created from Flutter API',
    ]);

    $createResponse
        ->assertCreated()
        ->assertJsonPath('data.title', 'Task Mobile');

    $taskId = $createResponse->json('data.id');

    $this->patchJson("/api/v1/tasks/{$taskId}", [
        'title' => 'Task Mobile Updated',
    ])->assertOk()
        ->assertJsonPath('data.title', 'Task Mobile Updated');

    $this->deleteJson("/api/v1/tasks/{$taskId}")
        ->assertNoContent();

    expect(Task::query()->whereKey($taskId)->exists())->toBeFalse();
});

test('assignee who is not owner or admin cannot delete task through mobile api', function () {
    [$team, $column] = createMobileTaskWorkspace();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();
    $team->users()->attach($owner->id, ['role' => 'member']);
    $team->users()->attach($assignee->id, ['role' => 'member']);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Protected Task',
        'creator_id' => $owner->id,
        'order_position' => 0,
    ]);
    $task->assignees()->attach($assignee->id);

    Sanctum::actingAs($assignee);

    $this->deleteJson("/api/v1/tasks/{$task->id}")
        ->assertForbidden();
});

function createMobileTaskWorkspace(): array
{
    $team = Team::create([
        'name' => 'Mobile API Team',
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
