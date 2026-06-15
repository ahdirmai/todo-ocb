<?php

use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('user can submit quick feedback', function (): void {
    $this->actingAs($this->user);

    $response = $this->post('/feedback', [
        'category' => 'bug',
        'subject' => 'Test subject',
        'message' => 'Test message content',
        'rating' => 5,
    ]);

    $response->assertSessionHas('success');
    expect(Feedback::count())->toBe(1);
    expect(Feedback::first()->subject)->toBe('Test subject')
        ->and(Feedback::first()->feedback_cycle_id)->toBeNull();
});

test('multiple quick feedback submissions allowed', function (): void {
    $this->actingAs($this->user);

    $this->post('/feedback', [
        'subject' => 'First',
        'message' => 'First message',
    ])->assertSessionHas('success');

    $this->post('/feedback', [
        'subject' => 'Second',
        'message' => 'Second message',
    ])->assertSessionHas('success');

    expect(Feedback::count())->toBe(2);
});

test('requires subject and message', function (): void {
    $this->actingAs($this->user);

    $this->post('/feedback', [])
        ->assertSessionHasErrors(['subject', 'message']);
});

test('message max 5000 characters', function (): void {
    $this->actingAs($this->user);

    $this->post('/feedback', [
        'subject' => 'Test',
        'message' => str_repeat('a', 5001),
    ])->assertSessionHasErrors('message');
});

test('rating must be between 1 and 5', function (): void {
    $this->actingAs($this->user);

    $this->post('/feedback', [
        'subject' => 'Test',
        'message' => 'Test',
        'rating' => 6,
    ])->assertSessionHasErrors('rating');
});

test('unauthenticated user cannot submit feedback', function (): void {
    $this->post('/feedback', [
        'subject' => 'Test',
        'message' => 'Test',
    ])->assertRedirect(route('login'));
});
