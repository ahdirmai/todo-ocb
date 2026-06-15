<?php

use App\Models\Feedback;
use App\Models\FeedbackCycle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Role::create(['name' => 'superadmin', 'guard_name' => 'web']);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('superadmin');

    $this->normalUser = User::factory()->create();
});

test('admin can view feedback page', function (): void {
    $this->actingAs($this->admin)
        ->get('/admin/feedback')
        ->assertOk();
});

test('non-admin cannot view feedback page', function (): void {
    $this->actingAs($this->normalUser)
        ->get('/admin/feedback')
        ->assertForbidden();
});

test('unauthenticated user cannot view feedback page', function (): void {
    $this->get('/admin/feedback')
        ->assertRedirect(route('login'));
});

test('admin can open new cycle', function (): void {
    $this->actingAs($this->admin);

    $this->post('/admin/feedback/open', [
        'title' => 'Sesi Baru',
        'description' => 'Deskripsi sesi baru',
    ])->assertSessionHas('success');

    $cycle = FeedbackCycle::where('title', 'Sesi Baru')->first();
    expect($cycle)->not->toBeNull()
        ->and($cycle->is_open)->toBeTrue()
        ->and($cycle->created_by)->toBe($this->admin->id);
});

test('opening new cycle auto-closes previous active cycle', function (): void {
    $this->actingAs($this->admin);

    $first = FeedbackCycle::create([
        'is_open' => true,
        'title' => 'First',
        'opened_at' => now(),
        'created_by' => $this->admin->id,
    ]);

    $this->post('/admin/feedback/open', [
        'title' => 'Second',
    ])->assertSessionHas('success');

    expect($first->fresh()->is_open)->toBeFalse()
        ->and($first->fresh()->closed_at)->not->toBeNull();
});

test('admin can close active cycle', function (): void {
    $this->actingAs($this->admin);

    $cycle = FeedbackCycle::create([
        'is_open' => true,
        'title' => 'To Close',
        'opened_at' => now(),
        'created_by' => $this->admin->id,
    ]);

    $this->post("/admin/feedback/{$cycle->id}/close")
        ->assertSessionHas('success');

    expect($cycle->fresh()->is_open)->toBeFalse()
        ->and($cycle->fresh()->closed_at)->not->toBeNull();
});

test('feedback page shows cycle statistics and all feedback', function (): void {
    $this->actingAs($this->admin);

    $cycle = FeedbackCycle::create([
        'is_open' => true,
        'title' => 'Stats Test',
        'opened_at' => now(),
        'created_by' => $this->admin->id,
    ]);

    Feedback::create([
        'feedback_cycle_id' => $cycle->id,
        'user_id' => $this->normalUser->id,
        'subject' => 'Feedback A',
        'message' => 'Message A',
    ]);

    $response = $this->get('/admin/feedback');

    $response->assertSee('Stats Test')
        ->assertSee('Feedback A');
});

test('admin can export feedback to excel', function (): void {
    $this->actingAs($this->admin);

    Feedback::create([
        'user_id' => $this->normalUser->id,
        'category' => 'bug',
        'subject' => 'Export Test',
        'message' => 'Test message',
    ]);

    $response = $this->get('/admin/feedback/export');

    $response->assertOk();
    expect($response->headers->get('Content-Disposition'))->toContain('.xlsx');
});
