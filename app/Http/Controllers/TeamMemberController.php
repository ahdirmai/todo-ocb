<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
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

        // syncWithoutDetaching so re-invite doesn't error
        $team->users()->syncWithoutDetaching([
            $validated['user_id'] => ['role' => $role],
        ]);

        return back();
    }

    /**
     * Remove a user from the team.
     */
    public function destroy(Team $team, User $user)
    {
        // Prevent removing self if you're the only admin
        $team->users()->detach($user->id);

        return back();
    }
}
