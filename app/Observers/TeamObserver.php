<?php

namespace App\Observers;

use App\Models\Team;
use App\Services\ActivityLogger;

class TeamObserver
{
    public function created(Team $team): void
    {
        ActivityLogger::log(
            event: 'created',
            logName: 'team',
            description: "Tim \"{$team->name}\" dibuat",
            subject: $team,
            teamId: $team->id,
        );
    }

    public function updated(Team $team): void
    {
        $dirty = $team->getDirty();

        $skipKeys = ['updated_at'];
        $relevantKeys = array_diff(array_keys($dirty), $skipKeys);

        if (empty($relevantKeys)) {
            return;
        }

        $description = "Tim \"{$team->name}\" diperbarui";

        if (isset($dirty['is_active']) && $dirty['is_active'] === false) {
            $description = "Tim \"{$team->name}\" diarsipkan";
        } elseif (isset($dirty['is_active']) && $dirty['is_active'] === true) {
            $description = "Tim \"{$team->name}\" dipulihkan";
        } elseif (isset($dirty['name'])) {
            $description = "Tim berganti nama dari \"{$team->getOriginal('name')}\" menjadi \"{$team->name}\"";
        }

        ActivityLogger::log(
            event: 'updated',
            logName: 'team',
            description: $description,
            subject: $team,
            teamId: $team->id,
        );
    }

    public function deleted(Team $team): void
    {
        ActivityLogger::log(
            event: 'deleted',
            logName: 'team',
            description: "Tim \"{$team->name}\" dihapus",
            subject: $team,
            teamId: $team->id,
        );
    }
}
