<?php

use App\Jobs\CheckTaskComplianceJob;
use App\Models\KpiDailyScore;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\AiTaskCheckService;
use App\Services\KpiScoringService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->withoutVite();
    Storage::fake('public');
});

function makeAiSpvUser(): User
{
    $position = Position::create([
        'name' => 'SPV AI '.uniqid(),
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

function makeAiTask(User $user, int $attempts = 0, ?string $status = null): Task
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => 10,
        'require_video_upload' => false,
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
        'ai_check_status' => $status,
        'ai_check_attempts' => $attempts,
    ]);
}

/** Attach a comment carrying one image so evidence is "full". */
function attachFullEvidence(Task $task, User $user): void
{
    $comment = $task->comments()->create([
        'user_id' => $user->id,
        'content' => 'Sudah dikerjakan sesuai SOP.',
    ]);

    $file = UploadedFile::fake()->create('photo.jpg', 100, 'image/jpeg');
    $media = $comment->addMedia($file)->toMediaCollection('documents');
    $media->mime_type = 'image/jpeg';
    $media->save();
}

test('verify dispatches AI job and sets status pending when evidence is complete', function (): void {
    Queue::fake();
    $user = makeAiSpvUser();
    $task = makeAiTask($user);
    attachFullEvidence($task, $user);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasNoErrors();

    expect($task->fresh()->ai_check_status)->toBe('pending');
    Queue::assertPushed(CheckTaskComplianceJob::class);
});

test('verify is blocked without full evidence', function (): void {
    Queue::fake();
    $user = makeAiSpvUser();
    $task = makeAiTask($user);
    // Comment only, no media → evidence not full.
    $task->comments()->create(['user_id' => $user->id, 'content' => 'tanpa foto']);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasErrors('error');

    Queue::assertNothingPushed();
    expect($task->fresh()->ai_check_status)->toBeNull();
});

test('verify is rejected once attempts are exhausted', function (): void {
    Queue::fake();
    $user = makeAiSpvUser();
    $task = makeAiTask($user, attempts: 3, status: 'failed');
    attachFullEvidence($task, $user);

    actingAs($user)
        ->post(route('spv.kpi.tasks.verify', $task))
        ->assertSessionHasErrors('error');

    Queue::assertNothingPushed();
});

test('job marks task passed and verified when score is high', function (): void {
    $user = makeAiSpvUser();
    $task = makeAiTask($user, status: 'pending');
    attachFullEvidence($task, $user);

    $this->mock(AiTaskCheckService::class, function ($mock) {
        $mock->shouldReceive('scoreCompliance')->once()->andReturn(['score' => 25.0, 'feedback' => 'Sangat sesuai work method & verifikasi']);
    });

    (new CheckTaskComplianceJob($task->id))->handle(
        app(AiTaskCheckService::class),
        app(KpiScoringService::class),
    );

    $fresh = $task->fresh();
    expect($fresh->ai_check_status)->toBe('passed')
        ->and($fresh->is_verified)->toBeTrue()
        ->and((float) $fresh->ai_compliance_score)->toBe(95.0);
});

test('job marks task failed with remaining attempts when score is low', function (): void {
    $user = makeAiSpvUser();
    $task = makeAiTask($user, status: 'pending');
    attachFullEvidence($task, $user);

    $this->mock(AiTaskCheckService::class, function ($mock) {
        $mock->shouldReceive('scoreCompliance')->once()->andReturn(['score' => 2.0, 'feedback' => 'Komentar terlalu singkat, tidak menjelaskan cara kerja']);
    });

    (new CheckTaskComplianceJob($task->id))->handle(
        app(AiTaskCheckService::class),
        app(KpiScoringService::class),
    );

    $fresh = $task->fresh();
    expect($fresh->ai_check_status)->toBe('failed')
        ->and($fresh->is_verified)->toBeFalse()
        ->and($fresh->ai_check_attempts)->toBe(1);
});

test('third low-score attempt exhausts and awards partial daily credit', function (): void {
    $user = makeAiSpvUser();
    // Already 2 attempts used; this run is the 3rd.
    $task = makeAiTask($user, attempts: 2, status: 'pending');
    attachFullEvidence($task, $user);

    $this->mock(AiTaskCheckService::class, function ($mock) {
        $mock->shouldReceive('scoreCompliance')->once()->andReturn(['score' => 3.0, 'feedback' => 'Komentar tidak menjelaskan cara kerja']);
    });

    (new CheckTaskComplianceJob($task->id))->handle(
        app(AiTaskCheckService::class),
        app(KpiScoringService::class),
    );

    $fresh = $task->fresh();
    expect($fresh->ai_check_status)->toBe('exhausted')
        ->and($fresh->is_verified)->toBeFalse();

    // Daily score: partial = total/100 * weight = 73/100 * 10 = 7.3
    // (70 baseline + 3 AI content =73 total; exhausted gets partial credit)
    $score = KpiDailyScore::where('user_id', $user->id)
        ->where('score_date', now()->toDateString())
        ->firstOrFail();
    expect((float) $score->completed_weight)->toBe(7.3);
});

test('failed result always carries a reason even if AI feedback is empty', function (): void {
    $user = makeAiSpvUser();
    $task = makeAiTask($user, status: 'pending');
    attachFullEvidence($task, $user);

    $this->mock(AiTaskCheckService::class, function ($mock) {
        $mock->shouldReceive('scoreCompliance')->once()->andReturn(['score' => 2.0, 'feedback' => '']);
    });

    (new CheckTaskComplianceJob($task->id))->handle(
        app(AiTaskCheckService::class),
        app(KpiScoringService::class),
    );

    $fresh = $task->fresh();
    expect($fresh->ai_check_status)->toBe('failed')
        ->and($fresh->ai_check_feedback)->not->toBe('')
        ->and($fresh->ai_check_feedback)->not->toBeNull();
});

test('job failure does not burn an attempt', function (): void {
    $user = makeAiSpvUser();
    $task = makeAiTask($user, status: 'pending');
    attachFullEvidence($task, $user);

    $this->mock(AiTaskCheckService::class, function ($mock) {
        $mock->shouldReceive('scoreCompliance')->once()->andThrow(new RuntimeException('API down'));
    });

    (new CheckTaskComplianceJob($task->id))->handle(
        app(AiTaskCheckService::class),
        app(KpiScoringService::class),
    );

    $fresh = $task->fresh();
    expect($fresh->ai_check_status)->toBe('failed')
        ->and($fresh->ai_check_attempts)->toBe(0);
});
