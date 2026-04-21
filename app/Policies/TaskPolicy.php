<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->hasRole(['superadmin', 'admin'])) {
            return true;
        }

        return $task->team()->whereHas('users', fn ($query) => $query->whereKey($user->id))->exists();
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->hasRole(['superadmin', 'admin'])) {
            return true;
        }

        if ($task->creator_id === $user->id) {
            return true;
        }

        return $task->team
            ?->users()
            ->whereKey($user->id)
            ->wherePivot('role', 'admin')
            ->exists()
            || $task->assignees()->whereKey($user->id)->exists();
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->hasRole(['superadmin', 'admin'])) {
            return true;
        }

        if ($task->creator_id === $user->id) {
            return true;
        }

        return $task->team
            ?->users()
            ->whereKey($user->id)
            ->wherePivot('role', 'admin')
            ->exists() ?? false;
    }

    public function restore(User $user, Task $task): bool
    {
        return false;
    }

    public function forceDelete(User $user, Task $task): bool
    {
        return false;
    }
}
