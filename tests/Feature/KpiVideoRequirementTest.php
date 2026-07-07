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

function makeVideoSpvUser(): User
{
    $position = Position::create([
        'name' => 'SPV Video '.uniqid(),
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

function makeVideoTask(User $user, bool $requireVideo): Task
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => 10,
        'require_video_upload' => $requireVideo,
        // Isolate the video requirement from the photo-minimum gate.
        'minimum_photos' => 0,
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

function attachMediaToTask(Task $task, User $user, string $fileName, string $mime): void
{
    $comment = $task->comments()->create([
        'user_id' => $user->id,
        'content' => 'bukti',
    ]);

    $file = UploadedFile::fake()->create($fileName, 200, $mime);
    $media = $comment->addMedia($file)->toMediaCollection('documents');

    // Fake uploads may not sniff the intended mime from empty content; pin it
    // so the video/image distinction under test is deterministic.
    $media->mime_type = $mime;
    $media->save();
}

test('verify is blocked when video required and only a photo is attached', function (): void {
    $user = makeVideoSpvUser();
    $task = makeVideoTask($user, requireVideo: true);
    attachMediaToTask($task, $user, 'photo.jpg', 'image/jpeg');

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasErrors('error');

    expect($task->fresh()->is_verified)->toBeFalse();
});

test('verify succeeds when a video is attached', function (): void {
    $user = makeVideoSpvUser();
    $task = makeVideoTask($user, requireVideo: true);
    attachMediaToTask($task, $user, 'clip.mp4', 'video/mp4');

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasNoErrors();

    // Video gate passed → task proceeds to AI compliance check.
    expect($task->fresh()->ai_check_status)->not->toBeNull();
});

test('non-video task passes the gate and enters AI check', function (): void {
    $user = makeVideoSpvUser();
    $task = makeVideoTask($user, requireVideo: false);
    attachMediaToTask($task, $user, 'photo.jpg', 'image/jpeg');

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasNoErrors();

    expect($task->fresh()->ai_check_status)->not->toBeNull();
});

test('daily score does not auto-verify a video-required task without video', function (): void {
    $user = makeVideoSpvUser();
    $task = makeVideoTask($user, requireVideo: true);
    // Photo evidence only — would normally be "full" and auto-verify.
    attachMediaToTask($task, $user, 'photo.jpg', 'image/jpeg');

    app(KpiScoringService::class)->calculateDailyScore($user, now());

    expect($task->fresh()->is_verified)->toBeFalse();
});
