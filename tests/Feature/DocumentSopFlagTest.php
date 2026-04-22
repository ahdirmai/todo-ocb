<?php

use App\Enums\GroupingType;
use App\Models\Document;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

test('users can mark rich documents as sop when creating them', function () {
    $user = User::factory()->create();
    $team = createDocumentSopTeam();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $response = $this->actingAs($user)->post(route('documents.document.store', ['team' => $team->slug]), [
        'name' => 'SOP Proyek Properti',
        'content' => '<p>Upload photo of site before completing work.</p>',
        'is_sop' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('documents', [
        'team_id' => $team->id,
        'name' => 'SOP Proyek Properti',
        'type' => 'document',
        'is_sop' => true,
    ]);

    $document = Document::where('name', 'SOP Proyek Properti')->firstOrFail();

    $this->getJson(route('api.documents.show', $document))
        ->assertOk()
        ->assertJsonPath('data.is_sop', true);
});

test('users can mark uploaded files as sop', function () {
    $user = User::factory()->create();
    $team = createDocumentSopTeam();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $response = $this->actingAs($user)->post(route('documents.file.store', ['team' => $team->slug]), [
        'files' => [UploadedFile::fake()->create('sop-lapangan.pdf', 128, 'application/pdf')],
        'is_sop' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $document = Document::where('name', 'sop-lapangan.pdf')->firstOrFail();

    expect($document->is_sop)->toBeTrue();
    expect($document->getMedia('files'))->toHaveCount(1);
});

test('renaming a sop document preserves its sop flag when the field is omitted', function () {
    $user = User::factory()->create();
    $team = createDocumentSopTeam();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $document = Document::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'SOP Lama',
        'type' => 'document',
        'content' => '<p>Checklist lama</p>',
        'is_sop' => true,
    ]);

    $response = $this->actingAs($user)->put(route('documents.update', [
        'team' => $team->slug,
        'document' => $document,
    ]), [
        'name' => 'SOP Baru',
    ]);

    $response->assertSessionHasNoErrors();
    expect($document->fresh()->is_sop)->toBeTrue();
});

test('document uploads respect configured max file size', function () {
    config()->set('uploads.documents.max_file_kb', 128);

    $user = User::factory()->create();
    $team = createDocumentSopTeam();
    $team->users()->attach($user->id, ['role' => 'admin']);

    $response = $this->actingAs($user)->post(route('documents.document.store', ['team' => $team->slug]), [
        'name' => 'Dokumen Besar',
        'content' => '<p>Konten</p>',
        'attachments' => [
            UploadedFile::fake()->create('terlalu-besar.pdf', 129, 'application/pdf'),
        ],
    ]);

    $response->assertSessionHasErrors('attachments.0');
    $this->assertDatabaseMissing('documents', [
        'team_id' => $team->id,
        'name' => 'Dokumen Besar',
    ]);
});

function createDocumentSopTeam(): Team
{
    return Team::create([
        'name' => 'Lapangan',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);
}
