<?php

namespace App\Http\Controllers;

use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class KanbanColumnController extends Controller
{
    public function store(Request $request, Kanban $kanban)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $maxOrder = KanbanColumn::where('kanban_id', $kanban->id)->max('order') ?? -1;

        $column = KanbanColumn::create([
            'kanban_id' => $kanban->id,
            'title' => $validated['title'],
            'order' => $maxOrder + 1,
        ]);

        ActivityLogger::log(
            event: 'created',
            logName: 'kanban',
            description: "Kolom \"{$column->title}\" ditambahkan ke papan kanban",
            subject: $column,
            teamId: $kanban->team_id,
        );

        return back();
    }

    public function update(Request $request, KanbanColumn $column)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $oldTitle = $column->title;
        $column->update(['title' => $validated['title']]);

        ActivityLogger::log(
            event: 'updated',
            logName: 'kanban',
            description: "Kolom \"{$oldTitle}\" diubah menjadi \"{$validated['title']}\"",
            subject: $column,
            properties: ['old' => ['title' => $oldTitle], 'new' => ['title' => $validated['title']]],
            teamId: $column->kanban?->team_id,
        );

        return back();
    }

    public function destroy(KanbanColumn $column)
    {
        ActivityLogger::log(
            event: 'deleted',
            logName: 'kanban',
            description: "Kolom \"{$column->title}\" dihapus dari papan kanban",
            subject: $column,
            teamId: $column->kanban?->team_id,
        );

        $column->delete();

        return back();
    }
}
