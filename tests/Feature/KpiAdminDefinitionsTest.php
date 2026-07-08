<?php

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    Role::findOrCreate('superadmin', 'web');
});

function makeKpiAdmin(): User
{
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('superadmin');

    return $admin;
}

function definitionPayload(Position $position, array $overrides = []): array
{
    return array_merge([
        'position_id' => $position->id,
        'category' => 'Operasional',
        'task_name' => 'Task A',
        'description' => null,
        'work_method' => null,
        'verification_method' => null,
        'weight' => 5,
        'sequence_order' => 1,
        'can_upload_proof' => false,
        'auto_done_on_report' => false,
        'require_video_upload' => false,
        'minimum_photos' => 1,
    ], $overrides);
}

test('definition stores minimum_photos', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    actingAs($admin)
        ->post(route('kpi.admin.definitions.store'), definitionPayload($position, [
            'minimum_photos' => 3,
        ]))
        ->assertSessionHasNoErrors();

    expect((int) KpiTaskDefinition::where('position_id', $position->id)->value('minimum_photos'))->toBe(3);
});

test('definition stores require_video_upload flag', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    actingAs($admin)
        ->post(route('kpi.admin.definitions.store'), definitionPayload($position, [
            'require_video_upload' => true,
        ]))
        ->assertSessionHasNoErrors();

    expect(KpiTaskDefinition::where('position_id', $position->id)
        ->where('require_video_upload', true)->exists())->toBeTrue();
});

test('definitions page lists all positions', function (): void {
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('superadmin');

    Position::factory()->count(3)->create();

    $expected = Position::orderBy('name')->pluck('id')->all();

    actingAs($admin)
        ->get(route('kpi.admin.definitions'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('kpi/admin/definitions')
            ->has('positions', count($expected))
        );
});

test('auto-done definition accepted when total weight is within 10%', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    // Existing auto-done weight = 6%, new = 4% → total 10%, allowed.
    KpiTaskDefinition::factory()->create([
        'position_id' => $position->id,
        'auto_done_on_report' => true,
        'weight' => 6,
    ]);

    actingAs($admin)
        ->post(route('kpi.admin.definitions.store'), definitionPayload($position, [
            'auto_done_on_report' => true,
            'weight' => 4,
        ]))
        ->assertSessionHasNoErrors();

    expect(KpiTaskDefinition::where('position_id', $position->id)
        ->where('auto_done_on_report', true)->count())->toBe(2);
});

test('auto-done definition rejected when total weight exceeds 10%', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    KpiTaskDefinition::factory()->create([
        'position_id' => $position->id,
        'auto_done_on_report' => true,
        'weight' => 6,
    ]);

    actingAs($admin)
        ->post(route('kpi.admin.definitions.store'), definitionPayload($position, [
            'auto_done_on_report' => true,
            'weight' => 5, // 6 + 5 = 11% > 10%
        ]))
        ->assertSessionHasErrors('auto_done_on_report');

    expect(KpiTaskDefinition::where('position_id', $position->id)
        ->where('auto_done_on_report', true)->count())->toBe(1);
});

test('non-auto-done definitions do not count toward the 10% cap', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    // Large non-auto-done weight must not block a new auto-done task.
    KpiTaskDefinition::factory()->create([
        'position_id' => $position->id,
        'auto_done_on_report' => false,
        'weight' => 50,
    ]);

    actingAs($admin)
        ->post(route('kpi.admin.definitions.store'), definitionPayload($position, [
            'auto_done_on_report' => true,
            'weight' => 10,
        ]))
        ->assertSessionHasNoErrors();
});

test('updating auto-done definition ignores its own weight in the cap', function (): void {
    $admin = makeKpiAdmin();
    $position = Position::factory()->create();

    $definition = KpiTaskDefinition::factory()->create([
        'position_id' => $position->id,
        'auto_done_on_report' => true,
        'weight' => 8,
    ]);

    // Raising to 10% must pass — its own 8% is excluded from the running total.
    actingAs($admin)
        ->put(route('kpi.admin.definitions.update', $definition), [
            'category' => $definition->category,
            'task_name' => $definition->task_name,
            'description' => null,
            'work_method' => null,
            'verification_method' => null,
            'weight' => 10,
            'sequence_order' => $definition->sequence_order,
            'is_active' => true,
            'can_upload_proof' => false,
            'auto_done_on_report' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($definition->fresh()->weight)->toBe('10.00');
});
