<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    /**
     * Invite (add) an existing user to the team immediately.
     */
    public function store(Request $request, Team $team)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'sometimes|string|in:admin,member',
        ]);

        $role = $validated['role'] ?? 'member';
        $user = User::find($validated['user_id']);

        // syncWithoutDetaching so re-invite doesn't error
        $team->users()->syncWithoutDetaching([
            $validated['user_id'] => ['role' => $role],
        ]);

        ActivityLogger::log(
            event: 'member_added',
            logName: 'member',
            description: "Anggota \"{$user->name}\" ditambahkan ke tim \"{$team->name}\"",
            subject: $user,
            teamId: $team->id,
        );

        return back();
    }

    /**
     * Remove a user from the team.
     */
    public function destroy(Team $team, User $user)
    {
        $team->users()->detach($user->id);

        ActivityLogger::log(
            event: 'member_removed',
            logName: 'member',
            description: "Anggota \"{$user->name}\" dikeluarkan dari tim \"{$team->name}\"",
            subject: $user,
            teamId: $team->id,
        );

        return back();
    }
}
