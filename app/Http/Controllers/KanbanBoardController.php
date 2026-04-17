<?php

namespace App\Http\Controllers;

use App\Models\KanbanColumn;
use App\Models\Task;
use Illuminate\Http\Request;

class KanbanBoardController extends Controller
{
    public function reorderColumns(Request $request)
    {
        $validated = $request->validate([
            'columns' => 'required|array',
            'columns.*.id' => 'required|exists:kanban_columns,id',
            'columns.*.order' => 'required|integer',
        ]);

        foreach ($validated['columns'] as $column) {
            KanbanColumn::where('id', $column['id'])->update(['order' => $column['order']]);
        }

        return back();
    }

    public function reorderTasks(Request $request)
    {
        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:tasks,id',
            'tasks.*.kanban_column_id' => 'required|exists:kanban_columns,id',
            'tasks.*.order_position' => 'required|integer',
        ]);

        foreach ($validated['tasks'] as $taskData) {
            $task = Task::find($taskData['id']);
            if (!$task) continue;

            if ($task->kanban_column_id !== $taskData['kanban_column_id']) {
                $oldColumn = KanbanColumn::find($task->kanban_column_id);
                $newColumn = KanbanColumn::find($taskData['kanban_column_id']);

                \App\Services\ActivityLogger::log(
                    event: 'moved',
                    logName: 'task',
                    description: "Task \"{$task->title}\" dipindah ke kolom \"{$newColumn?->title}\"",
                    subject: $task,
                    properties: [
                        'old' => ['column' => $oldColumn?->title],
                        'new' => ['column' => $newColumn?->title],
                    ],
                    teamId: $task->team_id,
                );
            }

            $task->update([
                'kanban_column_id' => $taskData['kanban_column_id'],
                'order_position' => $taskData['order_position'],
            ]);
        }

        return back();
    }
}
