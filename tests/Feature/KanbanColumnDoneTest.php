<?php

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('creating a done column clears previous done column in the same board', function () {
    [$team, $kanban] = createKanbanColumnWorkspace();

    $existingDoneColumn = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Done',
        'order' => 0,
        'is_done' => true,
    ]);

    $user = User::factory()->create();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $response = $this->actingAs($user)->post(route('kanbans.columns.store', $kanban), [
        'title' => 'Closed',
        'is_done' => true,
    ]);

    $response->assertSessionHasNoErrors();

    $existingDoneColumn->refresh();

    $newDoneColumn = KanbanColumn::query()
        ->where('kanban_id', $kanban->id)
        ->where('title', 'Closed')
        ->first();

    expect($existingDoneColumn->is_done)->toBeFalse();
    expect($newDoneColumn)->not->toBeNull();
    expect($newDoneColumn?->is_done)->toBeTrue();
});

test('marking a column as done clears previous done column in the same board', function () {
    [$team, $kanban] = createKanbanColumnWorkspace();

    $backlogColumn = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Backlog',
        'order' => 0,
    ]);

    $doneColumn = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Done',
        'order' => 1,
        'is_done' => true,
    ]);

    $user = User::factory()->create();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $response = $this->actingAs($user)->put(route('kanbans.columns.update', $backlogColumn), [
        'is_done' => true,
    ]);

    $response->assertSessionHasNoErrors();

    expect($backlogColumn->fresh()->is_done)->toBeTrue();
    expect($doneColumn->fresh()->is_done)->toBeFalse();
});

function createKanbanColumnWorkspace(): array
{
    $team = Team::create([
        'name' => 'Column Team',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Column Board',
    ]);

    return [$team, $kanban];
}
