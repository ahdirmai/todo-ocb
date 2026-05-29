<?php

use App\Enums\GroupingType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class)->beforeEach(fn () => $this->withoutMiddleware(PreventRequestForgery::class));

function createSpvTestRoles(): void
{
    Role::findOrCreate('superadmin', 'web');
    Role::findOrCreate('admin', 'web');
}

function makeSpvTestTeam(string $name, bool $isSpv = false): Team
{
    return Team::create([
        'name' => $name,
        'slug' => Str::slug($name),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
        'is_spv_team' => $isSpv,
    ]);
}

test('superadmin can mark a team as spv team', function (): void {
    createSpvTestRoles();

    $superadmin = User::factory()->create(['email_verified_at' => now()]);
    $superadmin->assignRole('superadmin');

    $team = makeSpvTestTeam('Alpha Team');

    $this->actingAs($superadmin)
        ->patch(route('teams.toggle-spv', $team))
        ->assertRedirect();

    expect($team->fresh()->is_spv_team)->toBeTrue();
});

test('toggling off removes spv flag', function (): void {
    createSpvTestRoles();

    $superadmin = User::factory()->create(['email_verified_at' => now()]);
    $superadmin->assignRole('superadmin');

    $team = makeSpvTestTeam('Beta Team', true);

    $this->actingAs($superadmin)
        ->patch(route('teams.toggle-spv', $team))
        ->assertRedirect();

    expect($team->fresh()->is_spv_team)->toBeFalse();
});

test('only one spv team can exist at a time', function (): void {
    createSpvTestRoles();

    $superadmin = User::factory()->create(['email_verified_at' => now()]);
    $superadmin->assignRole('superadmin');

    $first = makeSpvTestTeam('First SPV', true);
    $second = makeSpvTestTeam('Second Team');

    $this->actingAs($superadmin)
        ->patch(route('teams.toggle-spv', $second))
        ->assertRedirect();

    expect($first->fresh()->is_spv_team)->toBeFalse();
    expect($second->fresh()->is_spv_team)->toBeTrue();
    expect(Team::where('is_spv_team', true)->count())->toBe(1);
});

test('non-superadmin is forbidden from toggling spv flag', function (): void {
    createSpvTestRoles();

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('admin');

    $team = makeSpvTestTeam('Gamma Team');

    $this->actingAs($admin)
        ->patch(route('teams.toggle-spv', $team))
        ->assertForbidden();
});
