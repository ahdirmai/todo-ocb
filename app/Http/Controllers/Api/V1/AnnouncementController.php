<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\AnnouncementDetailResource;
use App\Models\Announcement;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    private function attachmentMaxKilobytes(): int
    {
        return (int) config('uploads.documents.max_file_kb');
    }

    public function store(Request $request, Team $team)
    {
        $this->authorizeTeamMember($request, $team);

        $validated = $this->validateAnnouncement($request);
        $isRecurring = $request->boolean('is_recurring');

        $announcement = $team->announcements()->create($this->announcementPayload($request, $validated, $isRecurring));

        if ($announcement->is_recurring) {
            $recurrenceEndsAt = $announcement->calculateRecurrenceEndsAt(now());

            $announcement->update([
                'recurrence_ends_at' => $recurrenceEndsAt,
                'next_occurrence_at' => $announcement->calculateNextOccurrence(now()),
            ]);
        }

        $this->syncAttachments($request, $announcement, 'attachments');

        ActivityLogger::log(
            event: 'created',
            logName: 'announcement',
            description: 'Membuat pengumuman baru',
            subject: $announcement,
            teamId: $team->id,
            properties: ['title' => $announcement->title],
        );

        return response()->json([
            'message' => 'Announcement created successfully.',
            'data' => AnnouncementDetailResource::make($this->loadAnnouncement($announcement)),
        ], 201);
    }

    public function update(Request $request, Announcement $announcement)
    {
        Gate::authorize('update', $announcement);

        $validated = $this->validateAnnouncement($request, true);
        $isRecurring = $request->boolean('is_recurring');
        $announcement->update($this->announcementPayload($request, $validated, $isRecurring));

        if ($announcement->is_recurring) {
            $recurrenceEndsAt = $announcement->calculateRecurrenceEndsAt(now());

            $announcement->update([
                'recurrence_ends_at' => $recurrenceEndsAt,
                'next_occurrence_at' => $announcement->calculateNextOccurrence(now()),
            ]);
        }

        if (! empty($validated['removed_media_ids'])) {
            $announcement->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        $this->syncAttachments($request, $announcement, 'new_attachments');

        ActivityLogger::log(
            event: 'updated',
            logName: 'announcement',
            description: 'Memperbarui pengumuman',
            subject: $announcement,
            teamId: $announcement->team_id,
            properties: ['title' => $announcement->title],
        );

        return response()->json([
            'message' => 'Announcement updated successfully.',
            'data' => AnnouncementDetailResource::make($this->loadAnnouncement($announcement->fresh())),
        ]);
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
            teamId: $teamId,
            properties: ['title' => $title],
        );

        return response()->noContent();
    }

    private function validateAnnouncement(Request $request, bool $isUpdate = false): array
    {
        $isSuperadmin = $request->user()?->hasRole('superadmin') ?? false;
        $allowedRecurrenceUnits = $isSuperadmin
            ? ['second', 'minute', 'hour', 'day', 'week', 'month']
            : ['day', 'week', 'month'];
        $requiresClockTime = in_array($request->input('recurrence_frequency'), ['day', 'week', 'month'], true);

        return $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
            ($isUpdate ? 'new_attachments' : 'attachments') => ['nullable', 'array'],
            ($isUpdate ? 'new_attachments.*' : 'attachments.*') => ['nullable', 'file', 'max:'.$this->attachmentMaxKilobytes()],
            'removed_media_ids' => ['nullable', 'array'],
            'removed_media_ids.*' => ['integer'],
            'is_recurring' => ['nullable', 'boolean'],
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
                Rule::requiredIf($request->boolean('is_recurring') && $requiresClockTime),
                'nullable',
                'date_format:H:i',
            ],
            'recurrence_weekday' => [
                Rule::requiredIf($request->boolean('is_recurring') && $request->input('recurrence_frequency') === 'week'),
                'nullable',
                'integer',
                'between:1,7',
            ],
            'recurrence_month_day' => [
                Rule::requiredIf($request->boolean('is_recurring') && $request->input('recurrence_frequency') === 'month'),
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
    }

    private function announcementPayload(Request $request, array $validated, bool $isRecurring): array
    {
        $requiresClockTime = in_array($request->input('recurrence_frequency'), ['day', 'week', 'month'], true);

        return [
            'user_id' => $request->user()->id,
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'],
            'is_recurring' => $isRecurring,
            'recurrence_frequency' => $isRecurring ? $validated['recurrence_frequency'] : null,
            'recurrence_interval' => $isRecurring ? $validated['recurrence_interval'] : null,
            'recurrence_time' => $isRecurring && $requiresClockTime && isset($validated['recurrence_time'])
                ? "{$validated['recurrence_time']}:00"
                : null,
            'recurrence_weekday' => $isRecurring && ($validated['recurrence_frequency'] ?? null) === 'week'
                ? $validated['recurrence_weekday']
                : null,
            'recurrence_month_day' => $isRecurring && ($validated['recurrence_frequency'] ?? null) === 'month'
                ? $validated['recurrence_month_day']
                : null,
            'recurrence_limit_unit' => $isRecurring ? $validated['recurrence_limit_unit'] : null,
            'recurrence_limit_value' => $isRecurring ? $validated['recurrence_limit_value'] : null,
        ];
    }

    private function syncAttachments(Request $request, Announcement $announcement, string $field): void
    {
        if (! $request->hasFile($field)) {
            return;
        }

        foreach ($request->file($field) as $file) {
            $announcement->addMedia($file)->toMediaCollection('attachments');
        }
    }

    private function authorizeTeamMember(Request $request, Team $team): void
    {
        if ($request->user()->hasRole(['superadmin', 'admin'])) {
            return;
        }

        abort_unless($team->users()->whereKey($request->user()->id)->exists(), 403);
    }

    private function loadAnnouncement(Announcement $announcement): Announcement
    {
        return $announcement->load([
            'user',
            'media',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->with(['user', 'media', 'replies.user', 'replies.media'])
                ->latest(),
        ]);
    }
}
