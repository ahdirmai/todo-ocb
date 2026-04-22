<?php

use App\Enums\GroupingType;
use App\Jobs\ProcessRecurringAnnouncementReminder;
use App\Models\Announcement;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Role::findOrCreate('member', 'web');
});

function createAnnouncementContext(): array
{
    $user = User::factory()->create();
    $user->assignRole('member');

    $team = Team::create([
        'name' => 'Reminder Team',
        'slug' => 'reminder-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $team->users()->attach($user->id, ['role' => 'member']);

    return [$user, $team];
}

test('team member can create recurring announcement reminder', function () {
    Carbon::setTestNow('2026-04-22 10:00:00');

    [$user, $team] = createAnnouncementContext();

    $response = $this->actingAs($user)->post(route('teams.announcements.store', $team), [
        'title' => 'Reminder Standup',
        'content' => '<p>Standup tim dimulai jam 09.00.</p>',
        'is_recurring' => true,
        'recurrence_frequency' => 'week',
        'recurrence_interval' => 2,
        'recurrence_weekday' => 5,
        'recurrence_time' => '14:30',
        'recurrence_limit_unit' => 'month',
        'recurrence_limit_value' => 3,
    ]);

    $response->assertSessionHasNoErrors();

    $announcement = Announcement::query()->firstOrFail();

    expect($announcement->title)->toBe('Reminder Standup')
        ->and($announcement->is_recurring)->toBeTrue()
        ->and($announcement->recurrence_frequency)->toBe('week')
        ->and($announcement->recurrence_interval)->toBe(2)
        ->and($announcement->recurrence_weekday)->toBe(5)
        ->and($announcement->recurrence_time)->toBe('14:30:00')
        ->and($announcement->recurrence_limit_unit)->toBe('month')
        ->and($announcement->recurrence_limit_value)->toBe(3)
        ->and($announcement->recurrence_ends_at?->toDateTimeString())
        ->toBe('2026-07-22 14:30:00')
        ->and($announcement->next_occurrence_at?->toDateTimeString())
        ->toBe('2026-04-24 14:30:00');
});

test('creator can edit recurring announcement and replace attachments', function () {
    Carbon::setTestNow('2026-04-22 10:00:00');

    [$user, $team] = createAnnouncementContext();

    $announcement = Announcement::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'title' => 'Pengingat Lama',
        'content' => '<p>Konten lama.</p>',
        'is_recurring' => false,
    ]);

    $announcement
        ->addMedia(UploadedFile::fake()->image('lama.jpg'))
        ->toMediaCollection('attachments');

    $oldMedia = $announcement->getFirstMedia('attachments');

    $response = $this->actingAs($user)->put(route('announcements.update', $announcement), [
        'title' => 'Pengingat Baru',
        'content' => '<p>Konten baru.</p>',
        'is_recurring' => true,
        'recurrence_frequency' => 'month',
        'recurrence_interval' => 1,
        'recurrence_month_day' => 25,
        'recurrence_time' => '08:15',
        'recurrence_limit_unit' => 'week',
        'recurrence_limit_value' => 2,
        'removed_media_ids' => [$oldMedia?->id],
        'new_attachments' => [
            UploadedFile::fake()->image('baru.jpg'),
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $announcement->refresh();

    expect($announcement->title)->toBe('Pengingat Baru')
        ->and($announcement->content)->toBe('<p>Konten baru.</p>')
        ->and($announcement->is_recurring)->toBeTrue()
        ->and($announcement->recurrence_frequency)->toBe('month')
        ->and($announcement->recurrence_interval)->toBe(1)
        ->and($announcement->recurrence_month_day)->toBe(25)
        ->and($announcement->recurrence_time)->toBe('08:15:00')
        ->and($announcement->recurrence_limit_unit)->toBe('week')
        ->and($announcement->recurrence_limit_value)->toBe(2)
        ->and($announcement->recurrence_ends_at?->toDateTimeString())
        ->toBe('2026-05-06 08:15:00')
        ->and($announcement->next_occurrence_at?->toDateTimeString())
        ->toBe('2026-04-25 08:15:00')
        ->and($announcement->getMedia('attachments'))->toHaveCount(1)
        ->and($announcement->getFirstMedia('attachments')?->file_name)->toContain('baru');
});

test('dispatch recurring announcements command queues reminder jobs', function () {
    Carbon::setTestNow('2026-05-22 10:00:00');
    Queue::fake();

    [$user, $team] = createAnnouncementContext();

    $announcement = Announcement::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'title' => 'Reminder Laporan',
        'content' => '<p>Jangan lupa kirim laporan.</p>',
        'is_recurring' => true,
        'recurrence_frequency' => 'month',
        'recurrence_interval' => 1,
        'recurrence_month_day' => 21,
        'recurrence_time' => '09:45:00',
        'recurrence_limit_unit' => 'month',
        'recurrence_limit_value' => 2,
        'recurrence_ends_at' => Carbon::parse('2026-07-22 09:45:00'),
        'next_occurrence_at' => Carbon::parse('2026-05-21 09:45:00'),
    ]);

    $announcement
        ->addMedia(UploadedFile::fake()->image('poster.jpg'))
        ->toMediaCollection('attachments');

    $this->artisan('app:dispatch-recurring-announcements')
        ->assertSuccessful();

    Queue::assertPushed(ProcessRecurringAnnouncementReminder::class, function (
        ProcessRecurringAnnouncementReminder $job
    ) use ($announcement) {
        return $job->announcementId === $announcement->id;
    });
});

test('queued reminder job creates reminder copies', function () {
    Carbon::setTestNow('2026-05-22 10:00:00');

    [$user, $team] = createAnnouncementContext();

    $announcement = Announcement::create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'title' => 'Reminder Laporan',
        'content' => '<p>Jangan lupa kirim laporan.</p>',
        'is_recurring' => true,
        'recurrence_frequency' => 'month',
        'recurrence_interval' => 1,
        'recurrence_month_day' => 21,
        'recurrence_time' => '09:45:00',
        'recurrence_limit_unit' => 'month',
        'recurrence_limit_value' => 1,
        'recurrence_ends_at' => Carbon::parse('2026-05-22 09:45:00'),
        'next_occurrence_at' => Carbon::parse('2026-05-21 09:45:00'),
    ]);

    $announcement
        ->addMedia(UploadedFile::fake()->image('poster.jpg'))
        ->toMediaCollection('attachments');

    app(ProcessRecurringAnnouncementReminder::class, [
        'announcementId' => $announcement->id,
    ])->handle();

    $announcement->refresh();

    $reminder = Announcement::query()
        ->where('source_announcement_id', $announcement->id)
        ->first();

    expect($reminder)->not->toBeNull()
        ->and($reminder?->title)->toBe('Reminder Laporan')
        ->and($reminder?->is_recurring)->toBeFalse()
        ->and($reminder?->getMedia('attachments'))->toHaveCount(1)
        ->and($announcement->last_generated_at?->toDateTimeString())
        ->toBe(Carbon::now()->toDateTimeString())
        ->and($announcement->next_occurrence_at)->toBeNull();
});
