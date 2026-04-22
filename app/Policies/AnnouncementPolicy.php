<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Announcement $announcement): bool
    {
        return $announcement->team->users()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Announcement $announcement): bool
    {
        if ($user->hasRole(['superadmin', 'admin'])) {
            return true;
        }

        if ($announcement->user_id === $user->id) {
            return true;
        }

        return $announcement->team
            ?->users()
            ->whereKey($user->id)
            ->wherePivot('role', 'admin')
            ->exists() ?? false;
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $this->update($user, $announcement);
    }
}
