<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'kanban_column_id' => 'required|exists:kanban_columns,id',
            'team_id' => 'required|exists:teams,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $maxOrder = Task::where('kanban_column_id', $validated['kanban_column_id'])->max('order_position') ?? -1;
        
        $attachments = $request->file('attachments');
        unset($validated['attachments']);

        $task = Task::create([
            ...$validated,
            'creator_id' => $request->user()?->id,
            'order_position' => $maxOrder + 1,
        ]);

        if ($attachments) {
            foreach ($attachments as $file) {
                $task->addMedia($file)->toMediaCollection('documents');
            }
        }

        return back();
    }

    public function show(Task $task)
    {
        $task->load(['tags', 'comments.user', 'media']);

        return response()->json($task);
    }

    public function update(Request $request, Task $task)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'kanban_column_id' => 'sometimes|exists:kanban_columns,id',
            'order_position' => 'sometimes|integer',
            'tag_ids' => 'sometimes|array',
            'tag_ids.*' => 'exists:tags,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $tagIds = $validated['tag_ids'] ?? null;
        unset($validated['tag_ids']);
        
        $attachments = $request->file('attachments');
        unset($validated['attachments']);

        $task->update($validated);

        if ($tagIds !== null) {
            $task->tags()->sync($tagIds);
        }

        if ($attachments) {
            foreach ($attachments as $file) {
                $task->addMedia($file)->toMediaCollection('documents');
            }
        }

        return back();
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return back();
    }
}
