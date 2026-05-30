<?php

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureRoles();

    $this->superadmin = User::factory()->create();
    $this->superadmin->assignRole('superadmin');

    $this->admin = User::factory()->create();
    $this->admin->assignRole('admin');

    $this->user = User::factory()->create();
    $this->user->assignRole('member');
});

test('superadmin can view stores index', function () {
    Store::factory()->count(3)->create();

    $this->actingAs($this->superadmin)
        ->get(route('stores.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('stores/index')
            ->has('stores.data', 3)
        );
});

test('admin can view stores index', function () {
    Store::factory()->count(2)->create();

    $this->actingAs($this->admin)
        ->get(route('stores.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('stores/index')
            ->has('stores.data', 2)
        );
});

test('regular user cannot view stores index', function () {
    $this->actingAs($this->user)
        ->get(route('stores.index'))
        ->assertForbidden();
});

test('superadmin can create store', function () {
    $this->actingAs($this->superadmin)
        ->post(route('stores.store'), [
            'branch_code' => 'OC1',
            'name' => 'OSCAR CELL',
            'address' => 'Jl. Test No.123',
        ])
        ->assertRedirect(route('stores.index'));

    expect(Store::count())->toBe(1);
    expect(Store::first()->branch_code)->toBe('OC1');
});

test('admin can create store', function () {
    $this->actingAs($this->admin)
        ->post(route('stores.store'), [
            'branch_code' => 'OC2',
            'name' => 'AL RAIS CELL',
            'address' => 'Jl. Test No.456',
        ])
        ->assertRedirect(route('stores.index'));

    expect(Store::count())->toBe(1);
});

test('regular user cannot create store', function () {
    $this->actingAs($this->user)
        ->post(route('stores.store'), [
            'branch_code' => 'OC3',
            'name' => 'TEST CELL',
            'address' => 'Jl. Test',
        ])
        ->assertForbidden();

    expect(Store::count())->toBe(0);
});

test('branch code must be unique', function () {
    Store::factory()->create(['branch_code' => 'OC1']);

    $this->actingAs($this->superadmin)
        ->post(route('stores.store'), [
            'branch_code' => 'OC1',
            'name' => 'TEST CELL',
            'address' => 'Jl. Test',
        ])
        ->assertSessionHasErrors('branch_code');
});

test('superadmin can update store', function () {
    $store = Store::factory()->create([
        'branch_code' => 'OC1',
        'name' => 'OSCAR CELL',
        'address' => 'Jl. Old',
    ]);

    $this->actingAs($this->superadmin)
        ->put(route('stores.update', $store), [
            'branch_code' => 'OC1',
            'name' => 'OSCAR CELL UPDATED',
            'address' => 'Jl. New',
        ])
        ->assertRedirect(route('stores.index'));

    expect($store->fresh()->name)->toBe('OSCAR CELL UPDATED');
    expect($store->fresh()->address)->toBe('Jl. New');
});

test('admin can update store', function () {
    $store = Store::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('stores.update', $store), [
            'branch_code' => $store->branch_code,
            'name' => 'Updated Name',
            'address' => 'Updated Address',
        ])
        ->assertRedirect(route('stores.index'));

    expect($store->fresh()->name)->toBe('Updated Name');
});

test('regular user cannot update store', function () {
    $store = Store::factory()->create(['name' => 'Original']);

    $this->actingAs($this->user)
        ->put(route('stores.update', $store), [
            'branch_code' => $store->branch_code,
            'name' => 'Hacked',
            'address' => 'Hacked',
        ])
        ->assertForbidden();

    expect($store->fresh()->name)->toBe('Original');
});

test('superadmin can delete store', function () {
    $store = Store::factory()->create();

    $this->actingAs($this->superadmin)
        ->delete(route('stores.destroy', $store))
        ->assertRedirect(route('stores.index'));

    expect(Store::count())->toBe(0);
});

test('admin can delete store', function () {
    $store = Store::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('stores.destroy', $store))
        ->assertRedirect(route('stores.index'));

    expect(Store::count())->toBe(0);
});

test('regular user cannot delete store', function () {
    $store = Store::factory()->create();

    $this->actingAs($this->user)
        ->delete(route('stores.destroy', $store))
        ->assertForbidden();

    expect(Store::count())->toBe(1);
});

test('store search filters by branch code, name, and address', function () {
    Store::factory()->create(['branch_code' => 'OC1', 'name' => 'OSCAR CELL', 'address' => 'Jl. Banjarmasin']);
    Store::factory()->create(['branch_code' => 'OC2', 'name' => 'AL RAIS CELL', 'address' => 'Jl. Martapura']);
    Store::factory()->create(['branch_code' => 'OC3', 'name' => 'ARFA CELL', 'address' => 'Jl. Jakarta']);

    $this->actingAs($this->superadmin)
        ->get(route('stores.index', ['search' => 'Martapura']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('stores/index')
            ->has('stores.data', 1)
            ->where('stores.data.0.branch_code', 'OC2')
        );
});

test('validation requires all fields', function () {
    $this->actingAs($this->superadmin)
        ->post(route('stores.store'), [])
        ->assertSessionHasErrors(['branch_code', 'name', 'address']);
});
