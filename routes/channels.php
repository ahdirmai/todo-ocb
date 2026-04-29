<?php

use App\Models\Team;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Private team chat channel.
 * Only authenticated team members may subscribe.
 */
Broadcast::channel('team.{teamId}', function ($user, string $teamId) {
    return Team::where('id', $teamId)
        ->whereHas('users', fn ($q) => $q->where('users.id', $user->id))
        ->exists();
});
