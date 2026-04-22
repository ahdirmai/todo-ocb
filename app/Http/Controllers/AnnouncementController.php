<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    public function store(Request $request, Team $team): RedirectResponse
    {
        abort_unless($team->users()->where('user_id', request()->user()->id)->exists(), 403);
        $isSuperadmin = $request->user()?->hasRole('superadmin') ?? false;
        $allowedRecurrenceUnits = $isSuperadmin
            ? ['second', 'minute', 'hour', 'day', 'week', 'month']
            : ['day', 'week', 'month'];

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'nullable|file|max:10240',
            'is_recurring' => 'nullable|boolean',
            'recurrence_frequency' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'string',
                Rule::in($allowedRecurrenceUnits),
            ],
            'recurrence_interval' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'integer',
                'min:1',
                'max:365',
            ],
            'recurrence_time' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'date_format:H:i',
            ],
            'recurrence_weekday' => [
                Rule::requiredIf(
                    $request->boolean('is_recurring')
                    && $request->input('recurrence_frequency') === 'week'
                ),
                'nullable',
                'integer',
                'between:1,7',
            ],
            'recurrence_month_day' => [
                Rule::requiredIf(
                    $request->boolean('is_recurring')
                    && $request->input('recurrence_frequency') === 'month'
                ),
                'nullable',
                'integer',
                'between:1,31',
            ],
            'recurrence_limit_unit' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'string',
                Rule::in($allowedRecurrenceUnits),
            ],
            'recurrence_limit_value' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'integer',
                'min:1',
                'max:365',
            ],
        ]);

        $isRecurring = $request->boolean('is_recurring');

        $announcement = $team->announcements()->create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'],
            'is_recurring' => $isRecurring,
            'recurrence_frequency' => $isRecurring ? $validated['recurrence_frequency'] : null,
            'recurrence_interval' => $isRecurring ? $validated['recurrence_interval'] : null,
            'recurrence_time' => $isRecurring ? "{$validated['recurrence_time']}:00" : null,
            'recurrence_weekday' => $isRecurring && $validated['recurrence_frequency'] === 'week'
                ? $validated['recurrence_weekday']
                : null,
            'recurrence_month_day' => $isRecurring && $validated['recurrence_frequency'] === 'month'
                ? $validated['recurrence_month_day']
                : null,
            'recurrence_limit_unit' => $isRecurring ? $validated['recurrence_limit_unit'] : null,
            'recurrence_limit_value' => $isRecurring ? $validated['recurrence_limit_value'] : null,
            'recurrence_ends_at' => null,
            'next_occurrence_at' => null,
        ]);

        if ($announcement->is_recurring) {
            $recurrenceEndsAt = $announcement->calculateRecurrenceEndsAt(now());
            $announcement->recurrence_ends_at = $recurrenceEndsAt;

            $announcement->update([
                'recurrence_ends_at' => $recurrenceEndsAt,
                'next_occurrence_at' => $announcement->calculateNextOccurrence(now()),
            ]);
        }

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $announcement->addMedia($file)->toMediaCollection('attachments');
            }
        }

        ActivityLogger::log(
            event: 'created',
            logName: 'announcement',
            description: 'Membuat pengumuman baru',
            subject: $announcement,
            teamId: $team->id,
            properties: ['title' => $announcement->title]
        );

        return back();
    }

    public function update(Request $request, Announcement $announcement): RedirectResponse
    {
        Gate::authorize('update', $announcement);
        $isSuperadmin = $request->user()?->hasRole('superadmin') ?? false;
        $allowedRecurrenceUnits = $isSuperadmin
            ? ['second', 'minute', 'hour', 'day', 'week', 'month']
            : ['day', 'week', 'month'];

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
            'new_attachments' => 'nullable|array',
            'new_attachments.*' => 'file|max:10240',
            'removed_media_ids' => 'nullable|array',
            'removed_media_ids.*' => 'integer',
            'is_recurring' => 'nullable|boolean',
            'recurrence_frequency' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'string',
                Rule::in($allowedRecurrenceUnits),
            ],
            'recurrence_interval' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'integer',
                'min:1',
                'max:365',
            ],
            'recurrence_time' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'date_format:H:i',
            ],
            'recurrence_weekday' => [
                Rule::requiredIf(
                    $request->boolean('is_recurring')
                    && $request->input('recurrence_frequency') === 'week'
                ),
                'nullable',
                'integer',
                'between:1,7',
            ],
            'recurrence_month_day' => [
                Rule::requiredIf(
                    $request->boolean('is_recurring')
                    && $request->input('recurrence_frequency') === 'month'
                ),
                'nullable',
                'integer',
                'between:1,31',
            ],
            'recurrence_limit_unit' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'string',
                Rule::in($allowedRecurrenceUnits),
            ],
            'recurrence_limit_value' => [
                Rule::requiredIf($request->boolean('is_recurring')),
                'nullable',
                'integer',
                'min:1',
                'max:365',
            ],
        ]);

        $isRecurring = $request->boolean('is_recurring');
        $recurrenceFrequency = $isRecurring ? $validated['recurrence_frequency'] : null;
        $recurrenceWeekday = $isRecurring && $recurrenceFrequency === 'week'
            ? $validated['recurrence_weekday']
            : null;
        $recurrenceMonthDay = $isRecurring && $recurrenceFrequency === 'month'
            ? $validated['recurrence_month_day']
            : null;
        $recurrenceTime = $isRecurring ? "{$validated['recurrence_time']}:00" : null;
        $recurrenceLimitUnit = $isRecurring ? $validated['recurrence_limit_unit'] : null;
        $recurrenceLimitValue = $isRecurring ? $validated['recurrence_limit_value'] : null;
        $recurrenceChanged = $announcement->is_recurring !== $isRecurring
            || $announcement->recurrence_frequency !== $recurrenceFrequency
            || (int) $announcement->recurrence_interval !== (int) ($validated['recurrence_interval'] ?? 0)
            || $announcement->recurrence_time !== $recurrenceTime
            || (int) $announcement->recurrence_weekday !== (int) ($recurrenceWeekday ?? 0)
            || (int) $announcement->recurrence_month_day !== (int) ($recurrenceMonthDay ?? 0)
            || $announcement->recurrence_limit_unit !== $recurrenceLimitUnit
            || (int) $announcement->recurrence_limit_value !== (int) ($recurrenceLimitValue ?? 0);

        $announcement->update([
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'],
            'is_recurring' => $isRecurring,
            'recurrence_frequency' => $recurrenceFrequency,
            'recurrence_interval' => $isRecurring ? $validated['recurrence_interval'] : null,
            'recurrence_time' => $recurrenceTime,
            'recurrence_weekday' => $recurrenceWeekday,
            'recurrence_month_day' => $recurrenceMonthDay,
            'recurrence_limit_unit' => $recurrenceLimitUnit,
            'recurrence_limit_value' => $recurrenceLimitValue,
            'recurrence_ends_at' => $isRecurring ? $announcement->recurrence_ends_at : null,
            'next_occurrence_at' => $isRecurring ? $announcement->next_occurrence_at : null,
        ]);

        if ($isRecurring && ($recurrenceChanged || ! $announcement->next_occurrence_at)) {
            $recurrenceEndsAt = $announcement->calculateRecurrenceEndsAt(now());
            $announcement->recurrence_ends_at = $recurrenceEndsAt;

            $announcement->update([
                'recurrence_ends_at' => $recurrenceEndsAt,
                'next_occurrence_at' => $announcement->calculateNextOccurrence(now()),
            ]);
        }

        if (! empty($validated['removed_media_ids'])) {
            $announcement->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        if ($request->hasFile('new_attachments')) {
            foreach ($request->file('new_attachments') as $file) {
                $announcement->addMedia($file)->toMediaCollection('attachments');
            }
        }

        ActivityLogger::log(
            event: 'updated',
            logName: 'announcement',
            description: 'Memperbarui pengumuman',
            subject: $announcement,
            teamId: $announcement->team_id,
            properties: ['title' => $announcement->title]
        );

        return back();
    }

    public function destroy(Announcement $announcement)
    {
        Gate::authorize('delete', $announcement);

        $teamId = $announcement->team_id;
        $title = $announcement->title;

        $announcement->delete();

        ActivityLogger::log(
            event: 'deleted',
            logName: 'announcement',
            description: 'Menghapus pengumuman',
            subject: null,
            teamId: $teamId,
            properties: ['title' => $title]
        );

        return back();
    }
}
