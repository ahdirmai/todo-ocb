<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    /**
     * Log an activity.
     *
     * @param  string  $event  e.g. 'created', 'updated', 'deleted', 'moved'
     * @param  string  $logName  e.g. 'task', 'comment', 'team', 'member', 'kanban', 'auth'
     * @param  string  $description  Human-readable description
     * @param  Model|null  $subject  The entity that was acted upon
     * @param  array<string,mixed>  $properties  Old/new values
     * @param  string|null  $teamId  For scoping per team
     * @param  Model|null  $causer  Who performed the action (defaults to authenticated user)
     */
    public static function log(
        string $event,
        string $logName,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        ?string $teamId = null,
        ?Model $causer = null,
    ): ActivityLog {
        $causer ??= Auth::user();

        return ActivityLog::create([
            'log_name' => $logName,
            'event' => $event,
            'description' => $description,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'causer_type' => $causer ? get_class($causer) : null,
            'causer_id' => $causer?->getKey(),
            'properties' => $properties ?: null,
            'team_id' => $teamId,
        ]);
    }
}
