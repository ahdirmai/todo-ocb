<?php

use App\Models\KpiDailyReport;
use App\Models\KpiDailyScore;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->withoutVite();
});

/**
 * SPV user on a fresh, uniquely named KPI position with a single required
 * report field, isolated from shared seed data.
 */
function makeAutoDoneSpvUser(): User
{
    $position = Position::create([
        'name' => 'SPV AutoDone '.uniqid(),
        'area_slug' => 'spv',
        'has_kpi' => true,
        'is_manager' => false,
        'requires_spv_team' => true,
    ]);

    PositionPermission::create([
        'position_id' => $position->id,
        'route_key' => 'spv',
    ]);

    PositionReportField::create([
        'position_id' => $position->id,
        'field_key' => 'catatan',
        'field_label' => 'Catatan Harian',
        'field_type' => 'textarea',
        'group_label' => 'Laporan',
        'is_required' => true,
        'sort_order' => 1,
    ]);

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);
}

function makeAutoDoneKpiTask(User $user, bool $autoDone, bool $verified, float $weight, ?string $teamId = null): Task
{
    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'weight' => $weight,
        'auto_done_on_report' => $autoDone,
    ]);

    return Task::factory()->create([
        'team_id' => $teamId,
        'creator_id' => $user->id,
        'kpi_task_definition_id' => $definition->id,
        'is_kpi_task' => true,
        'is_verified' => $verified,
        'verified_at' => $verified ? now() : null,
        'created_at' => now(),
    ]);
}

test('submitting the report auto-verifies flagged tasks', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeAutoDoneSpvUser();

    // Manual task (90%) already verified → gate is at 90%, above 80%.
    makeAutoDoneKpiTask($user, autoDone: false, verified: true, weight: 90);
    // Auto-done task (10%) not yet verified → should flip on submit.
    $autoTask = makeAutoDoneKpiTask($user, autoDone: true, verified: false, weight: 10);

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Laporan harian'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($autoTask->fresh()->is_verified)->toBeTrue();
});

test('auto-done task weight is added to the daily score', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeAutoDoneSpvUser();

    // Daily score for SPV positions is team-scoped, so the user needs an SPV
    // team and the tasks must belong to it.
    $team = Team::factory()->create(['is_spv_team' => true]);
    $user->teams()->attach($team->id);

    // Manual task passes the submit gate via its is_verified flag, but scores 0
    // because it has no evidence (comment/attachment). The auto-done task
    // contributes its full 10% weight without evidence.
    makeAutoDoneKpiTask($user, autoDone: false, verified: true, weight: 90, teamId: $team->id);
    makeAutoDoneKpiTask($user, autoDone: true, verified: false, weight: 10, teamId: $team->id);

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Laporan harian'],
        ])
        ->assertSessionHasNoErrors();

    $score = KpiDailyScore::where('user_id', $user->id)
        ->where('score_date', now()->toDateString())
        ->firstOrFail();

    // Only the auto-done task earns weight (evidence-free full credit).
    expect((float) $score->completed_weight)->toBe(10.0);
});

test('non-flagged tasks stay unverified after report submission', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeAutoDoneSpvUser();

    makeAutoDoneKpiTask($user, autoDone: false, verified: true, weight: 90);
    $manualTask = makeAutoDoneKpiTask($user, autoDone: false, verified: false, weight: 10);

    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Laporan harian'],
        ])
        ->assertSessionHasNoErrors();

    expect($manualTask->fresh()->is_verified)->toBeFalse();
});

test('editing the report does not auto-verify flagged tasks', function (): void {
    $this->travelTo(now()->setTime(10, 0));
    $user = makeAutoDoneSpvUser();

    makeAutoDoneKpiTask($user, autoDone: false, verified: true, weight: 100);

    // First submit creates the report (no auto-done task present yet).
    actingAs($user)
        ->post(route('spv.kpi.report.submit'), [
            'report_date' => now()->toDateString(),
            'fields' => ['catatan' => 'Awal'],
        ])
        ->assertSessionHasNoErrors();

    $report = KpiDailyReport::where('user_id', $user->id)->firstOrFail();

    // Add an auto-done task AFTER submission, then edit the report.
    $autoTask = makeAutoDoneKpiTask($user, autoDone: true, verified: false, weight: 10);

    actingAs($user)
        ->put(route('spv.kpi.report.update', $report), [
            'fields' => ['catatan' => 'Diedit'],
        ])
        ->assertSessionHasNoErrors();

    // Edit must not trigger auto-done.
    expect($autoTask->fresh()->is_verified)->toBeFalse();
});
