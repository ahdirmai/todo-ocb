<?php

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\KpiScoringService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->withoutVite();
    Storage::fake('public');
});

function makePhotoSpvUser(): User
{
    $position = Position::create([
        'name' => 'SPV Photo '.uniqid(),
        'area_slug' => 'spv',
        'has_kpi' => true,
        'is_manager' => false,
        'requires_spv_team' => true,
    ]);

    PositionPermission::create([
        'position_id' => $position->id,
        'route_key' => 'spv',
    ]);

    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);

    $team = Team::factory()->create(['is_spv_team' => true]);
    $user->teams()->attach($team->id);

    return $user;
}

function makePhotoTask(User $user, int $minimumPhotos): Task
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => 10,
        'require_video_upload' => false,
        'minimum_photos' => $minimumPhotos,
    ]);

    $team = $user->teams()->where('is_spv_team', true)->first();

    return Task::factory()->create([
        'team_id' => $team?->id,
        'creator_id' => $user->id,
        'kpi_task_definition_id' => $definition->id,
        'is_kpi_task' => true,
        'is_verified' => false,
        'created_at' => now(),
    ]);
}

/** Attach a comment carrying $count image attachments. */
function attachPhotoComment(Task $task, User $user, int $count): void
{
    $comment = $task->comments()->create([
        'user_id' => $user->id,
        'content' => 'bukti',
    ]);

    for ($i = 0; $i < $count; $i++) {
        $file = UploadedFile::fake()->create("photo_{$i}.jpg", 100, 'image/jpeg');
        $media = $comment->addMedia($file)->toMediaCollection('documents');
        $media->mime_type = 'image/jpeg';
        $media->save();
    }
}

test('verify is blocked when a comment has fewer photos than the minimum', function (): void {
    $user = makePhotoSpvUser();
    $task = makePhotoTask($user, minimumPhotos: 3);
    attachPhotoComment($task, $user, count: 2);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasErrors('error');

    expect($task->fresh()->is_verified)->toBeFalse();
});

test('verify succeeds when a single comment meets the photo minimum', function (): void {
    $user = makePhotoSpvUser();
    $task = makePhotoTask($user, minimumPhotos: 3);
    attachPhotoComment($task, $user, count: 3);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasNoErrors();

    expect($task->fresh()->is_verified)->toBeTrue();
});

test('photos spread across separate comments do not satisfy the minimum', function (): void {
    $user = makePhotoSpvUser();
    $task = makePhotoTask($user, minimumPhotos: 3);
    // Two comments with 2 + 2 photos: total 4 but max-in-one is 2 < 3.
    attachPhotoComment($task, $user, count: 2);
    attachPhotoComment($task, $user, count: 2);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasErrors('error');

    expect($task->fresh()->is_verified)->toBeFalse();
});

test('daily score does not award full credit below the photo minimum', function (): void {
    $user = makePhotoSpvUser();
    $task = makePhotoTask($user, minimumPhotos: 3);
    attachPhotoComment($task, $user, count: 1);

    app(KpiScoringService::class)->calculateDailyScore($user, now());

    expect($task->fresh()->is_verified)->toBeFalse();
});
