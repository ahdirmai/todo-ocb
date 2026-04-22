<?php

use App\Enums\GroupingType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function ensureTeamRoles(): void
{
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
}

test('renaming a team from its page redirects to the updated slug', function () {
    ensureTeamRoles();

    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    $admin->assignRole('admin');

    $team = Team::create([
        'name' => 'Alpha Team',
        'slug' => 'alpha-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->from('/teams/alpha-team/chat?focus=1')
        ->put(route('teams.update', $team), [
            'name' => 'Beta Team',
            'grouping' => 'team',
        ]);

    $response->assertRedirect('/teams/beta-team/chat?focus=1');
    expect($team->fresh()->slug)->toBe('beta-team');
});

test('renaming a team from a non-team page still redirects back normally', function () {
    ensureTeamRoles();

    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    $admin->assignRole('admin');

    $team = Team::create([
        'name' => 'Gamma Team',
        'slug' => 'gamma-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $this->actingAs($admin)->from('/teams/manage')
        ->put(route('teams.update', $team), [
            'name' => 'Gamma Updated',
            'grouping' => 'team',
        ])
        ->assertRedirect('/teams/manage');
});
