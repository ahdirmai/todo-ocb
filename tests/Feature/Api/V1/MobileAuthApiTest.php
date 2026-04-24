<?php

use App\Enums\GroupingType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('mobile login returns bearer token and current user payload', function () {
    $user = User::factory()->create([
        'email' => 'mobile@example.com',
        'password' => bcrypt('password'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'mobile@example.com',
        'password' => 'password',
        'device_name' => 'iPhone 15',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.email', 'mobile@example.com');

    expect($user->tokens()->count())->toBe(1);
});

test('authenticated mobile user can fetch own profile and teams', function () {
    $user = User::factory()->create();
    $team = Team::create([
        'name' => 'Auth Team',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);
    $team->users()->attach($user->id, ['role' => 'member']);

    $token = $user->createToken('Pixel 9')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/me/teams')
        ->assertOk()
        ->assertJsonFragment([
            'id' => $team->id,
            'name' => $team->name,
        ]);
});

test('mobile private endpoint requires sanctum authentication', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});
