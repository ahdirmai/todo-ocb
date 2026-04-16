<?php

namespace App\Http\Controllers;

use App\Enums\GroupingType;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function show(Team $team, string $tab = 'overview', ?string $item = null)
    {
        $team->load(['users' => fn ($q) => $q->withPivot('role')])->loadCount('tasks');

        if ($tab === 'task') {
            $team->load([
                'kanbans.columns.tasks.tags',
                'kanbans.columns.tasks.media',
                'kanbans.columns.tasks.comments.user',
                'kanbans.columns.tasks.comments.media',
            ]);
        }

        return Inertia::render('teams/show', [
            'team' => $team,
            'tab' => $tab,
            'item' => $item,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'grouping' => 'required|string|in:hq,team,project',
        ]);

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (Team::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $team = Team::create([
            'name' => $validated['name'],
            'grouping' => GroupingType::from($validated['grouping']),
            'slug' => $slug,
        ]);

        // Auto-attach the creating user as admin
        $team->users()->attach(auth()->id(), ['role' => 'admin']);

        // Auto-create default Kanban board
        $kanban = Kanban::create([
            'team_id' => $team->id,
            'name' => 'Papan Utama',
        ]);

        $defaultColumns = ['Backlog', 'In Progress', 'In Review', 'Done'];
        foreach ($defaultColumns as $index => $columnName) {
            KanbanColumn::create([
                'kanban_id' => $kanban->id,
                'title' => $columnName,
                'order' => $index,
                'is_default' => true,
            ]);
        }

        return back();
    }

    public function update(Request $request, Team $team)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'grouping' => 'sometimes|required|string|in:hq,team,project',
            'is_active' => 'sometimes|boolean',
        ]);

        // Regenerate slug only if name changed
        if ($validated['name'] !== $team->name) {
            $slug = Str::slug($validated['name']);
            $originalSlug = $slug;
            $counter = 1;
            while (Team::where('slug', $slug)->where('id', '!=', $team->id)->exists()) {
                $slug = "{$originalSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (isset($validated['grouping'])) {
            $validated['grouping'] = GroupingType::from($validated['grouping']);
        }

        $team->update($validated);

        return back();
    }

    public function archive(Team $team)
    {
        $team->update(['is_active' => false]);

        return back();
    }

    public function restore(Team $team)
    {
        $team->update(['is_active' => true]);

        return back();
    }

    public function destroy(Team $team)
    {
        $team->delete();

        return back();
    }
}
