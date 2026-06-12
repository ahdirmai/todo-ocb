<?php

use App\Models\Position;
use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    Role::findOrCreate('superadmin', 'web');
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
