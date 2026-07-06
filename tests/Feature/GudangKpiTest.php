<?php

use App\Models\Comment;
use App\Models\KpiDailyScore;
use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\Task;
use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

function makeGudangUser(string $positionName = 'Gudang BJB'): User
{
    // Phase 4: explicit metadata. The boot shim that auto-derived these fields
    // from the position name has been removed. Without these, a position like
    // "Manager Gudang" would default to has_kpi=false, is_manager=false, and
    // route authorization would silently deny access to /gudang/*.
    $isManager = str_contains(strtolower($positionName), 'manager');
    // Mirror the production seed: every gudang position (manager + line staff)
    // has requires_spv_team=false. Gudang line staff self-generate their own
    // daily KPI tasks without belonging to an SPV team.
    //
    // updateOrCreate (not firstOrCreate) so a stale row left by another suite
    // that shares this persistent test DB gets its KPI metadata corrected —
    // firstOrCreate would silently keep the old has_kpi=false row and 403.
    $position = Position::updateOrCreate(
        ['name' => $positionName],
        [
            'area_slug' => 'gudang',
            'has_kpi' => true,
            'is_manager' => $isManager,
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
    ]);
}

test('gudang position can access gudang kpi dashboard', function (): void {
    $user = makeGudangUser();

    actingAs($user)
        ->get(route('gudang.kpi.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/dashboard')
            ->where('canGenerateTasks', true)
        );
});

test('gudang position can generate daily kpi tasks without spv team', function (): void {
    $user = makeGudangUser('Gudang Gesekan');

    KpiTaskDefinition::factory()->count(2)->create([
        'position_id' => $user->position_id,
        'is_active' => true,
    ]);

    $expectedCount = KpiTaskDefinition::where('position_id', $user->position_id)
        ->where('is_active', true)
        ->count();

    actingAs($user)
        ->post(route('gudang.kpi.tasks.generate'), ['date' => now()->toDateString()])
        ->assertSessionHas('success');

    expect(Task::where('is_kpi_task', true)->where('creator_id', $user->id)->count())
        ->toBe($expectedCount);
});

test('gudang position scoring works after verifying task with evidence', function (): void {
    $user = makeGudangUser('Gudang ACC');

    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $user->position_id,
        'is_active' => true,
        'weight' => 40,
    ]);

    actingAs($user)
        ->post(route('gudang.kpi.tasks.generate'), ['date' => now()->toDateString()])
        ->assertSessionHas('success');

    $task = Task::where('is_kpi_task', true)
        ->where('creator_id', $user->id)
        ->where('kpi_task_definition_id', $definition->id)
        ->firstOrFail();

    Comment::create([
        'task_id' => $task->id,
        'user_id' => $user->id,
        'content' => 'Bukti pengerjaan task',
    ]);

    actingAs($user)
        ->post(route('gudang.kpi.tasks.verify', $task))
        ->assertSessionHas('success');

    $score = KpiDailyScore::where('user_id', $user->id)
        ->where('score_date', now()->toDateString())
        ->first();

    expect($score)->not->toBeNull()
        // comment without attachment = partial evidence = 30% of weight
        ->and((float) $score->total_score)->toBe(12.0);
});

test('superadmin sees gudang monitoring mode with user list', function (): void {
    Role::findOrCreate('superadmin', 'web');
    $gudangUser = makeGudangUser('Gudang BJM');

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('superadmin');

    actingAs($admin)
        ->get(route('gudang.kpi.dashboard', ['user_id' => $gudangUser->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/dashboard')
            ->where('canGenerateTasks', false)
            ->where('selectedUserId', $gudangUser->id)
            ->where('viewingAs.position', 'Gudang BJM')
            ->has('gudangUsers')
        );
});

test('user without gudang permission cannot access gudang area', function (): void {
    // Phase 4: boot shim removed — explicit metadata (Staff has no area/kpi).
    $position = Position::firstOrCreate(
        ['name' => 'Staff'],
        [
            'area_slug' => null,
            'has_kpi' => false,
            'is_manager' => false,
            'requires_spv_team' => true,
        ]
    );
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);

    actingAs($user)
        ->get(route('gudang.kpi.dashboard'))
        ->assertForbidden();
});

test('hr manager cannot view gudang area dashboard', function (): void {
    // Phase 4: explicit metadata. The boot shim previously auto-derived
    // area_slug='hr' from the name. Re-asserting it here keeps the test
    // contract stable across shim removal.
    $position = Position::firstOrCreate(
        ['name' => 'Manager HR'],
        [
            'area_slug' => 'hr',
            'has_kpi' => true,
            'is_manager' => true,
            'requires_spv_team' => false,
        ]
    );
    PositionPermission::firstOrCreate([
        'position_id' => $position->id,
        'route_key' => 'gudang',
    ]);
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);

    actingAs($user)
        ->get(route('gudang.kpi.dashboard'))
        ->assertForbidden();
});

test('manager gudang access own kpi dashboard', function (): void {
    $user = makeGudangUser('Manager Gudang');

    actingAs($user)
        ->get(route('gudang.kpi.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/dashboard')
            ->where('canGenerateTasks', true)
            ->missing('gudangUsers')
        );
});

test('manager gudang can generate and score own tasks', function (): void {
    $user = makeGudangUser('Manager Gudang');

    KpiTaskDefinition::factory()->count(3)->create([
        'position_id' => $user->position_id,
        'is_active' => true,
        'weight' => 33.33,
    ]);

    actingAs($user)
        ->post(route('gudang.kpi.tasks.generate'), ['date' => now()->toDateString()])
        ->assertSessionHas('success');

    $expectedCount = KpiTaskDefinition::where('position_id', $user->position_id)
        ->where('is_active', true)
        ->count();

    expect(Task::where('is_kpi_task', true)->where('creator_id', $user->id)->count())
        ->toBe($expectedCount);
});

test('manager gudang access monitoring page with team list', function (): void {
    $manager = makeGudangUser('Manager Gudang');

    actingAs($manager)
        ->get(route('gudang.kpi.monitoring'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/kpi/dashboard')
            ->where('canGenerateTasks', false)
            ->has('gudangUsers')
        );
});

test('manager gudang index page shows explicit choice', function (): void {
    $user = makeGudangUser('Manager Gudang');

    actingAs($user)
        ->get(route('gudang.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('gudang/index')
            ->where('isGudangManager', true)
            // Phase 4: gudangPositions is now data-driven from the DB (no more
            // hardcoded constant). Assert shape (presence + array) only —
            // don't pin a specific value because the controller prepends
            // 'Manager Gudang' only when the user is admin/superadmin, which
            // this test's user is NOT.
            ->has('gudangPositions')
        );
});
