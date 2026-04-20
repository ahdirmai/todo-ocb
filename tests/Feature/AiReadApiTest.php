<?php

use App\Enums\GroupingType;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Tag;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('team index is publicly accessible and returns all teams', function () {
    $user = User::factory()->create();
    $visibleTeam = createTeam(['name' => 'Product Squad']);
    $otherTeam = createTeam(['name' => 'Hidden Squad']);

    $visibleTeam->users()->attach($user->id, ['role' => 'member']);

    Task::create([
        'team_id' => $visibleTeam->id,
        'kanban_column_id' => createColumnForTeam($visibleTeam)->id,
        'title' => 'Visible task',
        'order_position' => 0,
    ]);

    Document::create([
        'team_id' => $visibleTeam->id,
        'user_id' => $user->id,
        'name' => 'Roadmap',
        'type' => 'document',
    ]);

    $response = $this->getJson(route('api.teams.index'));

    $response
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect(collect($response->json('data'))->pluck('name')->all())
        ->toContain('Product Squad', 'Hidden Squad');
    expect($otherTeam->id)->not->toBeNull();
});

test('team context returns the ai-friendly snapshot payload', function () {
    $user = User::factory()->create(['name' => 'Ayu']);
    $assignee = User::factory()->create(['name' => 'Rizky']);
    $team = createTeam(['name' => 'Platform']);
    $team->users()->attach($user->id, ['role' => 'admin']);
    $team->users()->attach($assignee->id, ['role' => 'member']);

    $column = createColumnForTeam($team);
    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Bangun AI read API',
        'description' => 'Kontrak JSON dan endpoint baca data',
        'order_position' => 0,
        'creator_id' => $user->id,
    ]);
    $task->assignees()->attach([$user->id, $assignee->id]);

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'API Contract',
        'type' => 'document',
        'content' => 'Draft kontrak JSON',
    ]);

    TeamMessage::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'body' => 'Spec awal siap direview',
    ]);

    ActivityLog::create([
        'log_name' => 'task',
        'event' => 'created',
        'description' => 'Task AI read API dibuat',
        'subject_type' => Task::class,
        'subject_id' => $task->id,
        'causer_type' => User::class,
        'causer_id' => (string) $user->id,
        'team_id' => $team->id,
    ]);

    $response = $this->getJson(route('api.teams.context', $team));

    $response
        ->assertOk()
        ->assertJsonPath('data.team.name', 'Platform')
        ->assertJsonPath('data.members.0.name', 'Ayu')
        ->assertJsonPath('data.recent_tasks.0.title', 'Bangun AI read API')
        ->assertJsonPath('data.recent_documents.0.name', 'API Contract')
        ->assertJsonPath('data.recent_messages.0.body', 'Spec awal siap direview')
        ->assertJsonPath('data.recent_activity.0.event', 'created');

    expect($document->id)->not->toBeNull();
});

test('team task index applies filters and returns stable summary payloads', function () {
    $user = User::factory()->create();
    $tag = Tag::create([
        'name' => 'urgent',
        'color' => '#ff0000',
        'created_by' => $user->id,
    ]);
    $team = createTeam();
    $team->users()->attach($user->id, ['role' => 'member']);
    $column = createColumnForTeam($team);

    $matchingTask = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Fix API schema',
        'description' => 'Pastikan payload search stabil',
        'order_position' => 0,
        'creator_id' => $user->id,
        'due_date' => now()->addDay(),
    ]);
    $matchingTask->assignees()->attach($user->id);
    $matchingTask->tags()->attach($tag->id);

    $otherTask = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Dokumentasi sprint',
        'order_position' => 1,
    ]);

    Comment::create([
        'task_id' => $matchingTask->id,
        'user_id' => $user->id,
        'content' => 'Perlu finalisasi kontrak',
    ]);

    $response = $this->getJson(route('api.teams.tasks.index', [
        'team' => $team,
        'assignee_id' => $user->id,
        'tag_id' => $tag->id,
        'search' => 'schema',
    ]));

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Fix API schema')
        ->assertJsonPath('data.0.comments_count', 1)
        ->assertJsonPath('data.0.assignees.0.id', $user->id);

    expect($response->json('data.0.due_date'))->toBeString();
    expect($response->json('data.0.due_date'))->not->toContain('T');

    expect($otherTask->id)->not->toBe($matchingTask->id);
});

test('team detail is publicly accessible without authentication', function () {
    $owner = User::factory()->create();
    $team = createTeam();
    $team->users()->attach($owner->id, ['role' => 'admin']);

    $response = $this->getJson(route('api.teams.show', $team));

    $response
        ->assertOk()
        ->assertJsonPath('data.id', $team->id);
});

test('team search groups results by entity type', function () {
    $user = User::factory()->create(['name' => 'Api Rizky']);
    $team = createTeam(['name' => 'Search Team']);
    $team->users()->attach($user->id, ['role' => 'member']);
    $column = createColumnForTeam($team);

    Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'API contract cleanup',
        'description' => 'Sinkronkan payload AI',
        'order_position' => 0,
    ]);

    Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'API reference',
        'type' => 'document',
    ]);

    $response = $this->getJson(route('api.teams.search', [
        'team' => $team,
        'q' => 'api',
    ]));

    $response
        ->assertOk()
        ->assertJsonPath('query', 'api')
        ->assertJsonPath('results.tasks.0.type', 'task')
        ->assertJsonPath('results.documents.0.type', 'document')
        ->assertJsonPath('results.members.0.type', 'member');
});

test('team digest returns grouped operational snapshots', function () {
    $user = User::factory()->create();
    $team = createTeam(['name' => 'Digest Team']);
    $team->users()->attach($user->id, ['role' => 'member']);
    $column = createColumnForTeam($team);

    Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Task overdue',
        'order_position' => 0,
        'due_date' => now()->subDay(),
    ]);

    Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Task due today',
        'order_position' => 1,
        'due_date' => now(),
    ]);

    Announcement::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'title' => 'Daily update',
        'content' => 'Digest content',
    ]);

    TeamMessage::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'body' => 'Chat recap',
    ]);

    Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'Latest note',
        'type' => 'document',
    ]);

    $response = $this->getJson(route('api.teams.digest', $team));

    $response
        ->assertOk()
        ->assertJsonPath('data.team.name', 'Digest Team')
        ->assertJsonPath('data.overdue_tasks.0.title', 'Task overdue')
        ->assertJsonPath('data.tasks_due_today.0.title', 'Task due today')
        ->assertJsonPath('data.recent_announcements.0.title', 'Daily update')
        ->assertJsonPath('data.recent_messages.0.body', 'Chat recap')
        ->assertJsonPath('data.latest_documents.0.name', 'Latest note');

    expect($response->json('data.recent_messages.0.created_at'))->toBeString();
    expect($response->json('data.recent_messages.0.created_at'))->not->toContain('T');
});

test('announcement endpoints return summary and detail payloads', function () {
    $user = User::factory()->create();
    $team = createTeam(['name' => 'Announcement Team']);
    $team->users()->attach($user->id, ['role' => 'admin']);

    $announcement = Announcement::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'title' => 'API Rollout',
        'content' => 'Semua endpoint baru siap dipakai.',
    ]);

    Comment::create([
        'announcement_id' => $announcement->id,
        'user_id' => $user->id,
        'content' => 'Catatan penting',
    ]);

    $listResponse = $this->getJson(route('api.teams.announcements.index', $team));
    $detailResponse = $this->getJson(route('api.announcements.show', $announcement));

    $listResponse
        ->assertOk()
        ->assertJsonPath('data.0.title', 'API Rollout')
        ->assertJsonPath('data.0.comments_count', 1)
        ->assertJsonPath('data.0.links.api', route('api.announcements.show', $announcement));

    $detailResponse
        ->assertOk()
        ->assertJsonPath('data.title', 'API Rollout')
        ->assertJsonPath('data.comments.0.content', 'Catatan penting');
});

test('entity map and reference resolver return ai-friendly lookup data', function () {
    $user = User::factory()->create(['name' => 'Ayu API']);
    $team = createTeam(['name' => 'Lookup Team']);
    $team->users()->attach($user->id, ['role' => 'member']);
    $column = createColumnForTeam($team);

    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $column->id,
        'title' => 'Landing page API cleanup',
        'order_position' => 0,
    ]);

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'API roadmap',
        'type' => 'document',
    ]);

    $mapResponse = $this->getJson(route('api.teams.entity-map', $team));
    $resolveResponse = $this->postJson(route('api.teams.resolve-references', $team), [
        'text' => 'api',
    ]);

    $mapResponse
        ->assertOk()
        ->assertJsonPath('tasks.0.id', $task->id)
        ->assertJsonPath('documents.0.id', $document->id);

    $resolveResponse
        ->assertOk()
        ->assertJsonPath('matches.0.type', 'task')
        ->assertJsonPath('matches.1.type', 'document');
});

function createTeam(array $overrides = []): Team
{
    return Team::create(array_merge([
        'name' => 'Engineering',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ], $overrides));
}

function createColumnForTeam(Team $team): KanbanColumn
{
    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Main Board',
    ]);

    return KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'Backlog',
        'order' => 0,
        'is_default' => true,
    ]);
}
