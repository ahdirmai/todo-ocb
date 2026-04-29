<?php

use App\Enums\GroupingType;
use App\Jobs\ParseTeamSopJob;
use App\Models\Document;
use App\Models\DocumentSopStep;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Team;
use App\Models\User;
use App\Services\DocumentSopStepSyncService;
use App\Services\SopAiParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('admin parse request queues sop parsing job', function () {
    config()->set('services.openai.api_key', 'test-key');
    ensureSopRolesExist();
    Queue::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $team = createSopManagementTeam();
    $team->users()->attach($admin->id, ['role' => 'admin']);

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $admin->id,
        'name' => 'SOP Lapangan',
        'type' => 'document',
        'content' => '<ol><li>Survey lokasi dan catat hasilnya.</li></ol>',
        'is_sop' => true,
    ]);

    $response = $this->actingAs($admin)->post(route('teams.sop.parse', $team->slug), [
        'document_id' => $document->id,
        'platform' => 'openai',
    ]);

    $response->assertRedirect();
    Queue::assertPushed(ParseTeamSopJob::class, function (ParseTeamSopJob $job) use ($document): bool {
        return $job->documentId === $document->id
            && $job->platform === 'openai';
    });
    $this->assertDatabaseHas('documents', [
        'id' => $document->id,
        'sop_parse_status' => 'queued',
        'sop_parse_platform' => 'openai',
    ]);
});

test('admin can update sop step mapping and scoring', function () {
    ensureSopRolesExist();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $team = createSopManagementTeam();
    $team->users()->attach($admin->id, ['role' => 'admin']);

    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Board SOP',
    ]);

    $column = KanbanColumn::create([
        'kanban_id' => $kanban->id,
        'title' => 'QC Akhir',
        'order' => 2,
        'is_done' => false,
    ]);

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $admin->id,
        'name' => 'SOP Lapangan',
        'type' => 'document',
        'content' => '<p>Konten SOP</p>',
        'is_sop' => true,
    ]);

    $step = DocumentSopStep::create([
        'document_id' => $document->id,
        'sequence_order' => 1,
        'name' => 'Step Lama',
        'action' => 'Aksi lama',
        'keywords' => ['lama'],
        'required_evidence' => 'comment',
        'priority' => 'medium',
        'weight' => 3,
        'min_comment' => 1,
        'min_media' => 0,
        'is_mandatory' => true,
        'score_kurang' => 1,
        'score_cukup' => 2,
        'score_sangat_baik' => 3,
        'parsed_by' => 'ai',
        'parsed_from' => 'text',
    ]);

    $response = $this->actingAs($admin)->patch(route('teams.sop.steps.update', [
        'team' => $team->slug,
        'documentSopStep' => $step->id,
    ]), [
        'name' => 'QC Akhir',
        'action' => 'Periksa hasil akhir sebelum task ditutup.',
        'keywords' => ['qc', 'akhir'],
        'required_evidence' => 'both',
        'priority' => 'high',
        'weight' => 8,
        'min_comment' => 1,
        'min_media' => 1,
        'kanban_column_id' => $column->id,
        'score_kurang' => 2,
        'score_cukup' => 5,
        'score_sangat_baik' => 8,
        'is_mandatory' => true,
    ]);

    $response->assertRedirect();

    expect($step->fresh()->kanban_column_id)->toBe($column->id)
        ->and($step->fresh()->expected_column)->toBe('QC Akhir')
        ->and($step->fresh()->score_kurang)->toBe(2)
        ->and($step->fresh()->score_cukup)->toBe(5)
        ->and($step->fresh()->score_sangat_baik)->toBe(8);
});

test('non admin cannot access sop team tab', function () {
    ensureSopRolesExist();

    $member = User::factory()->create();
    $team = createSopManagementTeam();
    $team->users()->attach($member->id, ['role' => 'member']);

    $this->actingAs($member)
        ->get(route('teams.show', ['team' => $team->slug, 'tab' => 'sop']))
        ->assertForbidden();
});

test('queued sop parse job marks document completed after successful parse', function () {
    ensureSopRolesExist();

    $team = createSopManagementTeam();
    $user = User::factory()->create();

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'SOP Job',
        'type' => 'document',
        'content' => '<ol><li>Survey lokasi.</li></ol>',
        'is_sop' => true,
        'sop_parse_status' => 'queued',
        'sop_parse_platform' => 'openai',
    ]);

    $this->mock(SopAiParser::class, function ($mock): void {
        $mock->shouldReceive('parse')
            ->once()
            ->andReturn([
                [
                    'sequence_order' => 1,
                    'name' => 'Survey Lokasi',
                    'action' => 'Survey lokasi.',
                    'keywords' => ['survey', 'lokasi'],
                    'required_evidence' => 'comment',
                    'priority' => 'high',
                    'weight' => 5,
                    'min_comment' => 1,
                    'min_media' => 0,
                    'parsed_by' => 'ai',
                    'parsed_from' => 'text',
                    'is_mandatory' => true,
                ],
            ]);
    });

    app(ParseTeamSopJob::class, [
        'documentId' => $document->id,
        'platform' => 'openai',
    ])->handle(app(SopAiParser::class), app(DocumentSopStepSyncService::class));

    expect($document->fresh()->sop_parse_status)->toBe('completed')
        ->and($document->fresh()->sop_parse_error)->toBeNull();
    $this->assertDatabaseHas('document_sop_steps', [
        'document_id' => $document->id,
        'name' => 'Survey Lokasi',
    ]);
});

test('queued sop parse job marks document failed when parser fails', function () {
    ensureSopRolesExist();

    $team = createSopManagementTeam();
    $user = User::factory()->create();

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'SOP Job Fail',
        'type' => 'document',
        'content' => '<p>Konten SOP.</p>',
        'is_sop' => true,
        'sop_parse_status' => 'queued',
        'sop_parse_platform' => 'anthropic',
    ]);

    $this->mock(SopAiParser::class, function ($mock): void {
        $mock->shouldReceive('parse')
            ->once()
            ->andThrow(new RuntimeException('AI tidak mengembalikan SOP step yang dapat dipakai.'));
    });

    try {
        app(ParseTeamSopJob::class, [
            'documentId' => $document->id,
            'platform' => 'anthropic',
        ])->handle(app(SopAiParser::class), app(DocumentSopStepSyncService::class));
    } catch (RuntimeException) {
    }

    expect($document->fresh()->sop_parse_status)->toBe('failed')
        ->and($document->fresh()->sop_parse_error)->toContain('AI tidak mengembalikan SOP step');
});

test('queued sop parse job marks document failed with a specific message when source is unavailable', function () {
    ensureSopRolesExist();

    $team = createSopManagementTeam();
    $user = User::factory()->create();

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'SOP Kosong',
        'type' => 'file',
        'is_sop' => true,
        'sop_parse_status' => 'queued',
        'sop_parse_platform' => 'anthropic',
    ]);

    try {
        app(ParseTeamSopJob::class, [
            'documentId' => $document->id,
            'platform' => 'anthropic',
        ])->handle(app(SopAiParser::class), app(DocumentSopStepSyncService::class));
    } catch (RuntimeException) {
    }

    expect($document->fresh()->sop_parse_status)->toBe('failed')
        ->and($document->fresh()->sop_parse_error)->toContain('tidak memiliki konten teks atau file PDF');
});

function createSopManagementTeam(): Team
{
    return Team::create([
        'name' => 'Tim SOP',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);
}

function ensureSopRolesExist(): void
{
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('member', 'web');
}
