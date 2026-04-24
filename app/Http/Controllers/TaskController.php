<?php

namespace App\Http\Controllers;

use App\Models\KanbanColumn;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Uri;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    private function attachmentMaxKilobytes(): int
    {
        return (int) config('uploads.documents.max_file_kb');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kanban_column_id' => 'required|exists:kanban_columns,id',
            'team_id' => 'required|exists:teams,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
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

        $currentKanbanId = $task->kanbanColumn()->value('kanban_id');

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'kanban_column_id' => [
                'sometimes',
                Rule::exists('kanban_columns', 'id')->where(
                    fn ($query) => $query->where('kanban_id', $currentKanbanId),
                ),
            ],
            'order_position' => 'sometimes|integer|min:0',
            'tag_ids' => 'sometimes|array',
            'tag_ids.*' => 'exists:tags,id',
            'assignee_ids' => 'sometimes|array',
            'assignee_ids.*' => 'exists:users,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
        ]);

        $tagIds = $validated['tag_ids'] ?? null;
        unset($validated['tag_ids']);

        unset($validated['assignee_ids']);

        $attachments = $request->file('attachments');
        unset($validated['attachments']);

        $originalColumnId = $task->kanban_column_id;
        $targetColumnId = $validated['kanban_column_id'] ?? $originalColumnId;
        $columnChanged = array_key_exists('kanban_column_id', $validated)
            && $targetColumnId !== $originalColumnId;
        $positionChanged = array_key_exists('order_position', $validated)
            && (int) $validated['order_position'] !== (int) $task->order_position;

        // Log column move separately (before update so we have original)
        if ($columnChanged) {
            $oldColumn = KanbanColumn::find($task->kanban_column_id);
            $newColumn = KanbanColumn::find($targetColumnId);

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

        DB::transaction(function () use ($request, $positionChanged, $tagIds, $targetColumnId, $task, $validated, $columnChanged, $originalColumnId) {
            if ($columnChanged && ! array_key_exists('order_position', $validated)) {
                $validated['order_position'] = (Task::where('kanban_column_id', $targetColumnId)->max('order_position') ?? -1) + 1;
            }

            $task->update($validated);

            if ($columnChanged || $positionChanged) {
                $this->normalizeTaskOrder($originalColumnId);

                if ($targetColumnId !== $originalColumnId) {
                    $this->normalizeTaskOrder($targetColumnId);
                }

                $task->refresh();
            }

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
        });

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

    private function normalizeTaskOrder(string $columnId): void
    {
        Task::query()
            ->where('kanban_column_id', $columnId)
            ->orderBy('order_position')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id'])
            ->each(
                fn (Task $task, int $index) => Task::whereKey($task->id)
                    ->update(['order_position' => $index]),
            );
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        Gate::authorize('delete', $task);

        // Deletion is logged by TaskObserver
        $task->delete();

        return $this->redirectAfterDestroy($request);
    }

    private function redirectAfterDestroy(Request $request): RedirectResponse
    {
        $previousUrl = $request->headers->get('referer') ?? url()->previous();

        if (! is_string($previousUrl) || $previousUrl === '') {
            return back();
        }

        $sanitizedPreviousUrl = Uri::of($previousUrl)->withoutQuery(['taskId']);

        return redirect($sanitizedPreviousUrl->value());
    }
}
