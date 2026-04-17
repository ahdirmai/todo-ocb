<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'properties' => 'array',
    ];

    /** The entity that was changed. */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** The user who performed the action. */
    public function causer(): MorphTo
    {
        return $this->morphTo();
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @param Builder $query */
    public function scopeForTeam($query, string $teamId): void
    {
        $query->where('team_id', $teamId);
    }

    /** @param Builder $query */
    public function scopeByLogName($query, string $logName): void
    {
        $query->where('log_name', $logName);
    }
}
