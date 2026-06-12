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
    $position = Position::firstOrCreate(['name' => $positionName]);
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
    $position = Position::firstOrCreate(['name' => 'Staff']);
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position_id' => $position->id,
    ]);

    actingAs($user)
        ->get(route('gudang.kpi.dashboard'))
        ->assertForbidden();
});

test('hr manager cannot view gudang area dashboard', function (): void {
    $position = Position::firstOrCreate(['name' => 'Manager HR']);
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
