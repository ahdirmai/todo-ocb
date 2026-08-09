<?php

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\Task;
use App\Models\User;
use App\Services\AttendanceService;

use function Pest\Laravel\actingAs;

/**
 * Build a gudang-area user that self-generates KPI tasks (no SPV team needed),
 * mirroring the production seed metadata.
 */
function makeAttendanceGudangUser(?int $absenUserId = null): User
{
    $position = Position::updateOrCreate(
        ['name' => 'Gudang Gesekan'],
        [
            'area_slug' => 'gudang',
            'has_kpi' => true,
            'is_manager' => false,
            'requires_spv_team' => false,
        ]
    );
    PositionPermission::firstOrCreate([
        'position_id' => $position->id,
        'route_key' => 'gudang',
    ]);

    return User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
        'absen_user_id' => $absenUserId,
    ]);
}

test('unmapped user is treated as not checked in', function (): void {
    // absen_user_id is null → the service short-circuits without querying the
    // external attendance database, so this is deterministic offline.
    $user = makeAttendanceGudangUser(null);

    expect(app(AttendanceService::class)->hasCheckedInOn($user, now()))->toBeFalse();
});

test('generate is blocked when the user has not checked in', function (): void {
    $user = makeAttendanceGudangUser(1234);

    KpiTaskDefinition::factory()->count(2)->create([
        'position_id' => $user->position_id,
        'is_active' => true,
    ]);

    $this->mock(AttendanceService::class)
        ->shouldReceive('hasCheckedInOn')
        ->once()
        ->andReturn(false);

    actingAs($user)
        ->post(route('gudang.kpi.tasks.generate'), ['date' => now()->toDateString()])
        ->assertSessionHasErrors('error');

    expect(Task::where('is_kpi_task', true)->where('creator_id', $user->id)->count())
        ->toBe(0);
});

test('generate succeeds when the user has checked in', function (): void {
    $user = makeAttendanceGudangUser(1234);

    KpiTaskDefinition::factory()->count(2)->create([
        'position_id' => $user->position_id,
        'is_active' => true,
    ]);

    $expectedCount = KpiTaskDefinition::where('position_id', $user->position_id)
        ->where('is_active', true)
        ->count();

    $this->mock(AttendanceService::class)
        ->shouldReceive('hasCheckedInOn')
        ->once()
        ->andReturn(true);

    actingAs($user)
        ->post(route('gudang.kpi.tasks.generate'), ['date' => now()->toDateString()])
        ->assertSessionHas('success');

    expect(Task::where('is_kpi_task', true)->where('creator_id', $user->id)->count())
        ->toBe($expectedCount);
});
