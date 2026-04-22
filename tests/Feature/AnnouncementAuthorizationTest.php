<?php

use App\Enums\GroupingType;
use App\Models\Announcement;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('team member can create an announcement', function () {
    Role::findOrCreate('member', 'web');

    $user = User::factory()->create();
    $user->assignRole('member');

    $team = Team::create([
        'name' => 'Announcement Team',
        'slug' => 'announcement-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $team->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->post(route('teams.announcements.store', $team), [
        'title' => 'Info sprint',
        'content' => '<p>Standup dimulai jam 09.00.</p>',
    ]);

    $response->assertSessionHasNoErrors();

    expect(Announcement::query()->where('team_id', $team->id)->count())->toBe(1);
    expect(Announcement::query()->first())
        ->title->toBe('Info sprint');
});

test('non member cannot create an announcement in another team', function () {
    Role::findOrCreate('member', 'web');

    $user = User::factory()->create();
    $user->assignRole('member');

    $team = Team::create([
        'name' => 'Private Team',
        'slug' => 'private-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->post(route('teams.announcements.store', $team), [
        'title' => 'Info sprint',
        'content' => '<p>Standup dimulai jam 09.00.</p>',
    ]);

    $response->assertForbidden();
});

test('non member cannot view another team announcement page', function () {
    Role::findOrCreate('member', 'web');

    $user = User::factory()->create();
    $user->assignRole('member');

    $team = Team::create([
        'name' => 'Private Team',
        'slug' => 'private-team-view',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('teams.show', [
            'team' => $team->slug,
            'tab' => 'announcement',
        ]))
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/status')
            ->where('status', 403),
        );
});
