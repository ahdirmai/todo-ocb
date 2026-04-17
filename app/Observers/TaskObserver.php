<?php

namespace App\Observers;

use App\Models\Task;
use App\Services\ActivityLogger;

class TaskObserver
{
    public function created(Task $task): void
    {
        ActivityLogger::log(
            event: 'created',
            logName: 'task',
            description: "Task \"{$task->title}\" dibuat",
            subject: $task,
            teamId: $task->team_id,
        );
    }

    public function updated(Task $task): void
    {
        $dirty = $task->getDirty();

        // Skip if only order_position or kanban_column_id changed (handled by controller)
        $skipOnlyKeys = ['order_position', 'kanban_column_id', 'updated_at'];
        $relevantKeys = array_diff(array_keys($dirty), $skipOnlyKeys);

        if (empty($relevantKeys)) {
            return;
        }

        /** @var array<string,mixed> $properties */
        $properties = [];

        foreach ($relevantKeys as $key) {
            $properties['old'][$key] = $task->getOriginal($key);
            $properties['new'][$key] = $task->getAttribute($key);
        }

        ActivityLogger::log(
            event: 'updated',
            logName: 'task',
            description: "Task \"{$task->title}\" diperbarui",
            subject: $task,
            properties: $properties,
            teamId: $task->team_id,
        );
    }

    public function deleted(Task $task): void
    {
        ActivityLogger::log(
            event: 'deleted',
            logName: 'task',
            description: "Task \"{$task->title}\" dihapus",
            subject: $task,
            teamId: $task->team_id,
        );
    }
}
