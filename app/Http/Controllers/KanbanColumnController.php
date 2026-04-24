<?php

namespace App\Http\Controllers;

use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KanbanColumnController extends Controller
{
    public function store(Request $request, Kanban $kanban)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'is_done' => ['sometimes', 'boolean'],
        ]);

        $maxOrder = KanbanColumn::where('kanban_id', $kanban->id)->max('order') ?? -1;

        $column = DB::transaction(function () use ($kanban, $maxOrder, $validated): KanbanColumn {
            $isDone = (bool) ($validated['is_done'] ?? false);

            if ($isDone) {
                KanbanColumn::where('kanban_id', $kanban->id)->update(['is_done' => false]);
            }

            return KanbanColumn::create([
                'kanban_id' => $kanban->id,
                'title' => $validated['title'],
                'order' => $maxOrder + 1,
                'is_done' => $isDone,
            ]);
        });

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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'is_done' => ['sometimes', 'boolean'],
        ]);

        if ($validated === []) {
            return back();
        }

        $oldTitle = $column->title;
        $oldIsDone = $column->is_done;

        DB::transaction(function () use ($column, $validated): void {
            $updates = [];

            if (array_key_exists('title', $validated)) {
                $updates['title'] = $validated['title'];
            }

            if (array_key_exists('is_done', $validated)) {
                $updates['is_done'] = (bool) $validated['is_done'];

                if ($updates['is_done']) {
                    KanbanColumn::where('kanban_id', $column->kanban_id)
                        ->whereKeyNot($column->id)
                        ->update(['is_done' => false]);
                }
            }

            if ($updates !== []) {
                $column->update($updates);
            }
        });

        $column->refresh();

        $newTitle = $column->title;
        $newIsDone = $column->is_done;
        $description = match (true) {
            $oldTitle !== $newTitle && $oldIsDone !== $newIsDone => "Kolom \"{$oldTitle}\" diperbarui",
            $oldTitle !== $newTitle => "Kolom \"{$oldTitle}\" diubah menjadi \"{$newTitle}\"",
            $oldIsDone !== $newIsDone && $newIsDone => "Kolom \"{$newTitle}\" ditandai sebagai Done",
            $oldIsDone !== $newIsDone => "Kolom \"{$newTitle}\" tidak lagi ditandai sebagai Done",
            default => "Kolom \"{$newTitle}\" diperbarui",
        };

        ActivityLogger::log(
            event: 'updated',
            logName: 'kanban',
            description: $description,
            subject: $column,
            properties: [
                'old' => ['title' => $oldTitle, 'is_done' => $oldIsDone],
                'new' => ['title' => $newTitle, 'is_done' => $newIsDone],
            ],
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
