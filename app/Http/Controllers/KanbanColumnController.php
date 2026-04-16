<?php

namespace App\Http\Controllers;

use App\Models\Kanban;
use App\Models\KanbanColumn;
use Illuminate\Http\Request;

class KanbanColumnController extends Controller
{
    public function store(Request $request, Kanban $kanban)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $maxOrder = KanbanColumn::where('kanban_id', $kanban->id)->max('order') ?? -1;

        KanbanColumn::create([
            'kanban_id' => $kanban->id,
            'title' => $validated['title'],
            'order' => $maxOrder + 1,
        ]);

        return back();
    }

    public function update(Request $request, KanbanColumn $column)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $column->update(['title' => $validated['title']]);

        return back();
    }

    public function destroy(KanbanColumn $column)
    {
        $column->delete();

        return back();
    }
}
