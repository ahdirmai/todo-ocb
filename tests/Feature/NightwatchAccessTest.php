<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function ensureNightwatchRoles(): void
{
    Role::findOrCreate('member', 'web');
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
}

test('superadmin can access the app nightwatch entry point', function () {
    ensureNightwatchRoles();

    config()->set('services.nightwatch.dashboard_url', 'https://nightwatch.laravel.com');

    $user = User::factory()->create();
    $user->assignRole('superadmin');

    $this->actingAs($user)
        ->get(route('nightwatch'))
        ->assertRedirect('https://nightwatch.laravel.com');
});

test('non-superadmin cannot access the app nightwatch entry point', function () {
    ensureNightwatchRoles();

    $user = User::factory()->create();
    $user->assignRole('admin');

    $this->actingAs($user)
        ->get(route('nightwatch'))
        ->assertForbidden();
});
