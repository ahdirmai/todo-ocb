<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Announcement extends Model implements HasMedia
{
    use HasFactory, HasUuids, InteractsWithMedia;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_recurring' => 'boolean',
            'recurrence_weekday' => 'integer',
            'recurrence_month_day' => 'integer',
            'recurrence_limit_value' => 'integer',
            'next_occurrence_at' => 'datetime',
            'last_generated_at' => 'datetime',
            'recurrence_ends_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function sourceAnnouncement(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_announcement_id');
    }

    public function reminderOccurrences(): HasMany
    {
        return $this->hasMany(self::class, 'source_announcement_id');
    }

    public function isRecurringTemplate(): bool
    {
        return $this->is_recurring && $this->source_announcement_id === null;
    }

    public function calculateNextOccurrence(CarbonInterface $from): ?CarbonInterface
    {
        if (! $this->is_recurring || ! $this->recurrence_frequency || ! $this->recurrence_interval) {
            return null;
        }

        $candidate = $this->candidateForAnchor($from);

        if ($candidate && $candidate->gt($from)) {
            return $this->withinRecurrenceBoundary($candidate) ? $candidate : null;
        }

        $nextCandidate = $this->candidateForAnchor($this->advanceRecurrenceAnchor($from));

        return $nextCandidate && $this->withinRecurrenceBoundary($nextCandidate)
            ? $nextCandidate
            : null;
    }

    public function calculateRecurrenceEndsAt(CarbonInterface $from): ?CarbonInterface
    {
        if (! $this->is_recurring || ! $this->recurrence_limit_unit || ! $this->recurrence_limit_value) {
            return null;
        }

        $base = $from->copy();

        if (in_array($this->recurrence_frequency, ['day', 'week', 'month'], true)) {
            $base->setTimeFromTimeString($this->recurrence_time ?: '09:00:00');
        }
        $interval = max(1, (int) $this->recurrence_limit_value);

        return match ($this->recurrence_limit_unit) {
            'second' => $base->addSeconds($interval),
            'minute' => $base->addMinutes($interval),
            'hour' => $base->addHours($interval),
            'day' => $base->addDays($interval),
            'week' => $base->addWeeks($interval),
            'month' => $base->addMonthsNoOverflow($interval),
            default => null,
        };
    }

    protected function candidateForAnchor(CarbonInterface $anchor): ?CarbonInterface
    {
        $time = $this->recurrence_time ?: '09:00:00';
        $base = $anchor->copy();

        return match ($this->recurrence_frequency) {
            'second' => $base,
            'minute' => $base,
            'hour' => $base,
            'day' => $base->setTimeFromTimeString($time),
            'week' => $base
                ->startOfWeek(Carbon::MONDAY)
                ->addDays(max(1, min(7, (int) ($this->recurrence_weekday ?: 1))) - 1)
                ->setTimeFromTimeString($time),
            'month' => $base
                ->startOfMonth()
                ->setDay(
                    min(
                        max(1, (int) ($this->recurrence_month_day ?: 1)),
                        $base->startOfMonth()->daysInMonth,
                    ),
                )
                ->setTimeFromTimeString($time),
            default => null,
        };
    }

    protected function advanceRecurrenceAnchor(CarbonInterface $anchor): CarbonInterface
    {
        $interval = max(1, (int) $this->recurrence_interval);
        $base = $anchor->copy();

        return match ($this->recurrence_frequency) {
            'second' => $base->addSeconds($interval),
            'minute' => $base->addMinutes($interval),
            'hour' => $base->addHours($interval),
            'day' => $base->addDays($interval),
            'week' => $base->addWeeks($interval),
            'month' => $base->addMonthsNoOverflow($interval),
            default => $base,
        };
    }

    protected function withinRecurrenceBoundary(CarbonInterface $candidate): bool
    {
        return ! $this->recurrence_ends_at || $candidate->lte($this->recurrence_ends_at);
    }
}
