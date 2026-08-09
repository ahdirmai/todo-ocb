<?php

namespace App\Services;

use App\Models\Absen\Absensi;
use App\Models\User;
use Carbon\CarbonInterface;

class AttendanceService
{
    /**
     * Whether the user has a valid attendance tap in the external attendance
     * database on the given date.
     *
     * Users without an absen_user_id mapping cannot be verified, so they are
     * treated as not checked in — KPI task generation stays blocked until the
     * mapping is filled in.
     */
    public function hasCheckedInOn(User $user, CarbonInterface $date): bool
    {
        if (! $user->absen_user_id) {
            return false;
        }

        return Absensi::query()
            ->where('user_id', $user->absen_user_id)
            ->whereDate('absen_time', $date->toDateString())
            ->where('is_valid', 1)
            ->exists();
    }
}
