<?php

use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

/**
 * Phase 7: regression coverage for /positions admin form (Phase 4 surface)
 * and PositionController endpoints. Verifies that the 4 metadata fields
 * (has_kpi, is_manager, area_slug, requires_spv_team) round-trip through
 * the controller AND that the assign/remove/destroy guards behave as expected.
 *
 * Mirrors `KpiAdminDefinitionsTest` structure (admin-only routes, factory
 * helpers, no RefreshDatabase leakage between file runs).
 */
uses(RefreshDatabase::class);

beforeEach(function (): void {
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
});

function makeAdmin(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    return $user;
}

test('admin can view positions index', function (): void {
    $admin = makeAdmin();
    Position::factory()->count(3)->create();

    actingAs($admin)
        ->get(route('positions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('positions/index')
        );
});

test('superadmin can view positions index', function (): void {
    $superadmin = User::factory()->create(['email_verified_at' => now()]);
    $superadmin->assignRole('superadmin');

    actingAs($superadmin)
        ->get(route('positions.index'))
        ->assertOk();
});

test('non-admin user cannot view positions index', function (): void {
    $member = User::factory()->create(['email_verified_at' => now()]);
    $member->assignRole('member');

    actingAs($member)
        ->get(route('positions.index'))
        ->assertForbidden();
});

test('admin can create position with full metadata', function (): void {
    $admin = makeAdmin();

    actingAs($admin)
        ->post(route('positions.store'), [
            'name' => 'Manager Gudang',
            'description' => 'Manages warehouse team',
            'area_slug' => 'gudang',
            'is_manager' => true,
            'has_kpi' => true,
            'requires_spv_team' => true,
        ])
        ->assertRedirect();

    $position = Position::where('name', 'Manager Gudang')->first();
    expect($position)->not->toBeNull()
        ->and($position->area_slug)->toBe('gudang')
        ->and($position->is_manager)->toBeTrue()
        ->and($position->has_kpi)->toBeTrue()
        ->and($position->requires_spv_team)->toBeTrue()
        ->and($position->created_by)->toBe($admin->id);
});

test('admin can create position with no metadata checkboxes checked', function (): void {
    // Unchecked checkboxes + empty area_slug should persist as null/false,
    // not as the database default `true` for requires_spv_team. Confirms
    // $request->boolean() coerces correctly when the field is absent.
    $admin = makeAdmin();

    actingAs($admin)
        ->post(route('positions.store'), [
            'name' => 'Staff',
        ])
        ->assertRedirect();

    $position = Position::where('name', 'Staff')->first();
    expect($position)->not->toBeNull()
        ->and($position->area_slug)->toBeNull()
        ->and($position->is_manager)->toBeFalse()
        ->and($position->has_kpi)->toBeFalse()
        // Unchecked state from form => false (overrides migration default true).
        ->and($position->requires_spv_team)->toBeFalse()
        ->and($position->created_by)->toBe($admin->id);
});

test('store rejects duplicate name', function (): void {
    makeAdmin();
    Position::factory()->create(['name' => 'Manager Gudang']);

    actingAs(makeAdmin())
        ->post(route('positions.store'), ['name' => 'Manager Gudang'])
        ->assertSessionHasErrors('name');
});

test('store rejects missing name', function (): void {
    $admin = makeAdmin();

    actingAs($admin)
        ->post(route('positions.store'), [])
        ->assertSessionHasErrors('name');
});

test('store rejects name longer than 255 chars', function (): void {
    $admin = makeAdmin();

    actingAs($admin)
        ->post(route('positions.store'), ['name' => str_repeat('a', 256)])
        ->assertSessionHasErrors('name');
});

test('admin can update position metadata', function (): void {
    makeAdmin();
    $position = Position::factory()->generic()->create([
        'name' => 'Old Name',
        'description' => 'Initial',
    ]);

    actingAs(makeAdmin())
        ->put(route('positions.update', $position), [
            'name' => 'New Name',
            'description' => 'Updated',
            'area_slug' => 'operational',
            'is_manager' => true,
            'has_kpi' => true,
            'requires_spv_team' => true,
        ])
        ->assertRedirect();

    $fresh = $position->fresh();
    expect($fresh->name)->toBe('New Name')
        ->and($fresh->description)->toBe('Updated')
        ->and($fresh->area_slug)->toBe('operational')
        ->and($fresh->is_manager)->toBeTrue()
        ->and($fresh->has_kpi)->toBeTrue()
        ->and($fresh->requires_spv_team)->toBeTrue();
});

test('update allows keeping the same name on the same position', function (): void {
    makeAdmin();
    $position = Position::factory()->create([
        'name' => 'Manager Gudang',
        'description' => 'Initial',
    ]);

    actingAs(makeAdmin())
        ->put(route('positions.update', $position), [
            'name' => 'Manager Gudang',
            'description' => 'Updated',
            'area_slug' => 'gudang',
        ])
        ->assertRedirect();

    expect($position->fresh()->description)->toBe('Updated');
});

test('admin can delete an unused position', function (): void {
    makeAdmin();
    $position = Position::factory()->create(['name' => 'Throw Away']);

    actingAs(makeAdmin())
        ->delete(route('positions.destroy', $position))
        ->assertRedirect();

    expect(Position::find($position->id))->toBeNull();
});

test('destroy rejects when users have this position', function (): void {
    makeAdmin();
    $user = User::factory()->create(['email_verified_at' => now()]);
    $position = Position::factory()->create(['name' => 'In Use']);
    $user->update(['position_id' => $position->id]);

    actingAs(makeAdmin())
        ->delete(route('positions.destroy', $position))
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect(Position::find($position->id))->not->toBeNull();
});

test('admin can assign user to position', function (): void {
    makeAdmin();
    $user = User::factory()->create(['email_verified_at' => now()]);
    $position = Position::factory()->create(['name' => 'Manager Gudang']);

    actingAs(makeAdmin())
        ->post(route('positions.assign-user', $position), [
            'user_id' => $user->id,
            'position' => 'Manager Gudang BJB',
        ])
        ->assertRedirect();

    $fresh = $user->fresh();
    expect($fresh->position_id)->toBe($position->id)
        ->and($fresh->position)->toBe('Manager Gudang BJB');
});

test('assigning user preserves existing position name when blank', function (): void {
    makeAdmin();
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'position' => 'Pre-existing Title',
    ]);
    $position = Position::factory()->create(['name' => 'Manager']);

    actingAs(makeAdmin())
        ->post(route('positions.assign-user', $position), [
            'user_id' => $user->id,
            // No `position` override — should fall through to original.
        ])
        ->assertRedirect();

    expect($user->fresh()->position)->toBe('Pre-existing Title');
});

test('invalid user_id on assign-user fails validation', function (): void {
    $admin = makeAdmin();
    $position = Position::factory()->create(['name' => 'Manager Gudang']);

    actingAs($admin)
        ->post(route('positions.assign-user', $position), [
            'user_id' => 'not-a-uuid',
        ])
        ->assertSessionHasErrors('user_id');
});

test('admin can remove user from position', function (): void {
    makeAdmin();
    $user = User::factory()->create(['email_verified_at' => now()]);
    $position = Position::factory()->create(['name' => 'Manager Gudang']);
    $user->update(['position_id' => $position->id]);

    actingAs(makeAdmin())
        ->delete(route('positions.remove-user', $position), [
            'user_id' => $user->id,
        ])
        ->assertRedirect();

    expect($user->fresh()->position_id)->toBeNull();
});

test('users-without-position endpoint returns only unassigned users', function (): void {
    $admin = makeAdmin();
    $unassigned = User::factory()->create(['email_verified_at' => now()]);
    $assigned = User::factory()->create(['email_verified_at' => now()]);
    $position = Position::factory()->create(['name' => 'Manager']);
    $assigned->update(['position_id' => $position->id]);

    actingAs($admin)
        ->get(route('positions.users-without-position'))
        ->assertOk()
        ->assertJsonFragment(['id' => $unassigned->id])
        ->assertJsonMissing(['id' => $assigned->id]);
});
