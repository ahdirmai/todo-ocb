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

        foreach ($validated['tasks'] as $task) {
            Task::where('id', $task['id'])->update([
                'kanban_column_id' => $task['kanban_column_id'],
                'order_position' => $task['order_position'],
            ]);
        }

        return back();
    }
}
