<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function show(Team $team, string $tab = 'overview', ?string $item = null)
    {
        // Always load users
        $team->load('users');

        // Selectively load relations based on active tab
        if ($tab === 'task') {
            $team->load([
                'kanbans.columns.tasks.labels',
                'kanbans.columns.tasks.comments.user',
                'kanbans.columns.tasks.media',
            ]);
        }

        return Inertia::render('teams/show', [
            'team' => $team,
            'tab' => $tab,
            'item' => $item,
        ]);
    }
}
