<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        try {
            DB::transaction(function () use ($team, $validated, $role, $user): void {
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
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menambahkan anggota, silakan coba lagi.']);
        }

        return back();
    }

    /**
     * Remove a user from the team.
     */
    public function destroy(Team $team, User $user)
    {
        try {
            DB::transaction(function () use ($team, $user): void {
                $team->users()->detach($user->id);

                ActivityLogger::log(
                    event: 'member_removed',
                    logName: 'member',
                    description: "Anggota \"{$user->name}\" dikeluarkan dari tim \"{$team->name}\"",
                    subject: $user,
                    teamId: $team->id,
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menghapus anggota, silakan coba lagi.']);
        }

        return back();
    }

    public function mentionList(Team $team)
    {
        return response()->json(
            $team->users()->select('users.id', 'users.name', 'users.email')
                ->get()
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar_url' => $user->avatar_url,
                ])
        );
    }
}
