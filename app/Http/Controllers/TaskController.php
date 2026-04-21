<?php

namespace App\Http\Controllers;

use App\Models\KanbanColumn;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

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

        if ($request->user()) {
            $task->assignees()->attach($request->user()->id);
        }

        if ($attachments) {
            foreach ($attachments as $file) {
                $task->addMedia($file)->toMediaCollection('documents');
            }

            ActivityLogger::log(
                event: 'attachment_added',
                logName: 'task',
                description: count($attachments)." lampiran ditambahkan ke task \"{$task->title}\"",
                subject: $task,
                teamId: $task->team_id,
            );
        }

        // Task creation itself is logged by TaskObserver
        return back();
    }

    public function show(Task $task)
    {
        Gate::authorize('view', $task);

        $task->load(['tags', 'comments.user', 'media', 'assignees']);

        return response()->json($task);
    }

    public function update(Request $request, Task $task)
    {
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'kanban_column_id' => 'sometimes|exists:kanban_columns,id',
            'order_position' => 'sometimes|integer',
            'tag_ids' => 'sometimes|array',
            'tag_ids.*' => 'exists:tags,id',
            'assignee_ids' => 'sometimes|array',
            'assignee_ids.*' => 'exists:users,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $tagIds = $validated['tag_ids'] ?? null;
        unset($validated['tag_ids']);

        $assigneeIds = $validated['assignee_ids'] ?? null;
        unset($validated['assignee_ids']);

        $attachments = $request->file('attachments');
        unset($validated['attachments']);

        // Log column move separately (before update so we have original)
        if (isset($validated['kanban_column_id']) && $validated['kanban_column_id'] !== $task->kanban_column_id) {
            $oldColumn = KanbanColumn::find($task->kanban_column_id);
            $newColumn = KanbanColumn::find($validated['kanban_column_id']);

            ActivityLogger::log(
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

        $task->update($validated);

        if ($request->has('assignee_ids')) {
            $oldAssignees = $task->assignees()->pluck('users.id')->toArray();
            $newAssignees = $request->input('assignee_ids') ?? [];

            // Ensure creator is always included
            if ($task->creator_id && ! in_array($task->creator_id, $newAssignees)) {
                $newAssignees[] = $task->creator_id;
            }

            $task->assignees()->sync($newAssignees);

            $added = array_diff($newAssignees, $oldAssignees);
            $removed = array_diff($oldAssignees, $newAssignees);

            if ($added || $removed) {
                ActivityLogger::log(
                    event: 'assignees_changed',
                    logName: 'task',
                    description: "Anggota tugas pada \"{$task->title}\" diperbarui",
                    subject: $task,
                    properties: ['added' => array_values($added), 'removed' => array_values($removed)],
                    teamId: $task->team_id,
                );
            }
        }

        // Log tag changes
        if ($tagIds !== null) {
            $oldTagIds = $task->tags()->pluck('tags.id')->toArray();
            $task->tags()->sync($tagIds);

            $added = array_diff($tagIds, $oldTagIds);
            $removed = array_diff($oldTagIds, $tagIds);

            if ($added || $removed) {
                ActivityLogger::log(
                    event: 'tags_changed',
                    logName: 'task',
                    description: "Tag pada task \"{$task->title}\" diperbarui",
                    subject: $task,
                    properties: ['added' => array_values($added), 'removed' => array_values($removed)],
                    teamId: $task->team_id,
                );
            }
        }

        if ($attachments) {
            foreach ($attachments as $file) {
                $task->addMedia($file)->toMediaCollection('documents');
            }

            ActivityLogger::log(
                event: 'attachment_added',
                logName: 'task',
                description: count($attachments)." lampiran ditambahkan ke task \"{$task->title}\"",
                subject: $task,
                teamId: $task->team_id,
            );
        }

        return back();
    }

    public function destroy(Task $task)
    {
        Gate::authorize('delete', $task);

        // Deletion is logged by TaskObserver
        $task->delete();

        return back();
    }
}
