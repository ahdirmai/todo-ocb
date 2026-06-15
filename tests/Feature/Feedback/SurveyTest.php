<?php

use App\Models\Feedback;
use App\Models\FeedbackCycle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->cycle = FeedbackCycle::create([
        'is_open' => true,
        'title' => 'Survey App',
        'description' => 'Bantu kami evaluasi aplikasi',
        'opened_at' => now(),
        'created_by' => User::factory()->create()->id,
    ]);
});

test('shows survey page when cycle is active', function (): void {
    $this->actingAs($this->user)
        ->get('/survey')
        ->assertOk()
        ->assertSee('Survey App')
        ->assertSee('Bantu kami evaluasi aplikasi');
});

test('shows message when no active cycle', function (): void {
    $this->cycle->update(['is_open' => false]);

    $this->actingAs($this->user)
        ->get('/survey')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('survey', null)
            ->where('cycle', null)
        );
});

test('user can submit survey', function (): void {
    $this->actingAs($this->user);

    $response = $this->post('/survey', [
        'experience' => 4,
        'usage_duration' => '>3',
        'most_used_features' => ['dashboard', 'upload'],
        'most_helpful_feature' => 'Dashboard sangat membantu',
        'technical_issues' => ['slow'],
        'data_loss' => 'tidak',
        'desired_features' => ['notif-wa', 'mobile-app'],
        'suggestions' => 'Tambah fitur notifikasi',
    ]);

    $response->assertSessionHas('success');

    expect(Feedback::count())->toBe(1);
    $feedback = Feedback::first();
    expect($feedback->feedback_cycle_id)->toBe($this->cycle->id)
        ->and($feedback->category)->toBe('survey')
        ->and($feedback->survey_data)->not->toBeNull()
        ->and($feedback->survey_data['experience'])->toBe(4);
});

test('rejects duplicate survey submission', function (): void {
    $this->actingAs($this->user);

    $this->post('/survey', [
        'experience' => 4,
        'usage_duration' => '>3',
        'suggestions' => 'First',
    ])->assertSessionHas('success');

    $this->post('/survey', [
        'experience' => 3,
        'usage_duration' => '1-3',
        'suggestions' => 'Second',
    ])->assertSessionHasErrors('error');

    expect(Feedback::count())->toBe(1);
});

test('shows already submitted message on survey page', function (): void {
    $this->actingAs($this->user);

    $feedback = Feedback::create([
        'feedback_cycle_id' => $this->cycle->id,
        'user_id' => $this->user->id,
        'category' => 'survey',
        'subject' => 'Survey Penggunaan Aplikasi',
        'message' => 'Done',
        'rating' => 4,
        'survey_data' => ['experience' => 4],
    ]);

    $this->get('/survey')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('cycle.id', $this->cycle->id)
            ->where('survey.id', $feedback->id)
        );
});

test('requires experience and usage_duration', function (): void {
    $this->actingAs($this->user);

    $this->post('/survey', [])
        ->assertSessionHasErrors(['experience', 'usage_duration']);
});

test('unauthenticated cannot access survey page', function (): void {
    $this->get('/survey')->assertRedirect(route('login'));
});
