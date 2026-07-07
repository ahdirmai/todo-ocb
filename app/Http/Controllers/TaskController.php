<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\KanbanColumn;
use App\Models\Store;
use App\Models\Task;
use App\Services\ActivityLogger;
use Carbon\Carbon;
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
            'store_id' => 'nullable|exists:stores,id',
            'visit_date' => 'nullable|date',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
        ]);

        $attachments = $request->file('attachments');
        unset($validated['attachments']);

        // Validate: one store can only be visited once per day
        if (isset($validated['store_id']) && isset($validated['visit_date'])) {
            $existingTask = Task::where('store_id', $validated['store_id'])
                ->whereDate('visit_date', $validated['visit_date'])
                ->exists();

            if ($existingTask) {
                return back()->withErrors([
                    'store_id' => 'Toko ini sudah memiliki kunjungan pada tanggal tersebut.',
                ]);
            }
        }

        // Auto-set due_date to visit_date + 1 day if visit_date is provided
        if (isset($validated['visit_date']) && ! isset($validated['due_date'])) {
            $validated['due_date'] = Carbon::parse($validated['visit_date'])->addDay();
        }

        try {
            DB::transaction(function () use ($validated, $request, $attachments): void {
                $maxOrder = Task::where('kanban_column_id', $validated['kanban_column_id'])->max('order_position') ?? -1;

                $task = Task::create([
                    ...$validated,
                    'creator_id' => $request->user()?->id,
                    'order_position' => $maxOrder + 1,
                ]);

                // Auto-assign based on store's SPV
                $assigneeIds = [];

                if ($request->user()) {
                    $assigneeIds[] = $request->user()->id;
                }

                if (isset($validated['store_id'])) {
                    $store = Store::find($validated['store_id']);

                    if ($store && $store->spv_id && ! in_array($store->spv_id, $assigneeIds)) {
                        $assigneeIds[] = $store->spv_id;
                    }
                }

                if ($assigneeIds) {
                    $task->assignees()->attach($assigneeIds);
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
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal membuat task, silakan coba lagi.']);
        }

        return back();
    }

    public function show(Task $task)
    {
        Gate::authorize('view', $task);

        $perPage = (int) request()->input('per_page', 50);
        $page = (int) request()->input('page', 1);

        $task->load(['tags', 'media', 'assignees', 'creator']);

        $commentsQuery = $task->comments()
            ->with([
                'user',
                'media',
                'sopStep',
            ])
            ->whereNull('parent_id')
            ->latest();

        $paginatedComments = $commentsQuery->paginate($perPage, ['*'], 'page', $page);

        // Eager-load replies for loaded comments
        $commentIds = $paginatedComments->pluck('id')->all();
        $replies = Comment::whereIn('parent_id', $commentIds)
            ->with([
                'user',
                'media',
                'sopStep',
            ])
            ->oldest()
            ->get()
            ->groupBy('parent_id');

        $commentsData = $paginatedComments->map(fn ($comment) => [
            'id' => $comment->id,
            'content' => $comment->content,
            'user_id' => $comment->user_id,
            'parent_id' => $comment->parent_id,
            'document_sop_step_id' => $comment->document_sop_step_id,
            'created_at' => $comment->created_at->toISOString(),
            'updated_at' => $comment->updated_at?->toISOString(),
            'user' => $comment->user ? [
                'id' => $comment->user->id,
                'name' => $comment->user->name,
                'avatar_url' => $comment->user->avatar_url,
            ] : null,
            'media' => $comment->getMedia('*')->map(fn ($m) => [
                'id' => $m->id,
                'file_name' => $m->file_name,
                'mime_type' => $m->mime_type,
                'original_url' => $m->getUrl(),
                'size' => $m->size,
            ])->toArray(),
            'sop_step' => $comment->sopStep ? [
                'id' => $comment->sopStep->id,
                'name' => $comment->sopStep->name,
                'sequence_order' => $comment->sopStep->sequence_order,
            ] : null,
            'replies' => ($replies->get($comment->id) ?? collect())->map(fn ($reply) => [
                'id' => $reply->id,
                'content' => $reply->content,
                'user_id' => $reply->user_id,
                'parent_id' => $reply->parent_id,
                'document_sop_step_id' => $reply->document_sop_step_id,
                'created_at' => $reply->created_at->toISOString(),
                'updated_at' => $reply->updated_at?->toISOString(),
                'user' => $reply->user ? [
                    'id' => $reply->user->id,
                    'name' => $reply->user->name,
                    'avatar_url' => $reply->user->avatar_url,
                ] : null,
                'media' => $reply->getMedia('*')->map(fn ($m) => [
                    'id' => $m->id,
                    'file_name' => $m->file_name,
                    'mime_type' => $m->mime_type,
                    'original_url' => $m->getUrl(),
                    'size' => $m->size,
                ])->toArray(),
                'sop_step' => $reply->sopStep ? [
                    'id' => $reply->sopStep->id,
                    'name' => $reply->sopStep->name,
                    'sequence_order' => $reply->sopStep->sequence_order,
                ] : null,
            ])->toArray(),
        ]);

        return response()->json([
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'creator_id' => $task->creator_id,
                'due_date' => $task->due_date?->toISOString(),
                'visit_date' => $task->visit_date?->toDateString(),
                'created_at' => $task->created_at?->toISOString(),
                'updated_at' => $task->updated_at?->toISOString(),
                'kanban_column_id' => $task->kanban_column_id,
                'order_position' => $task->order_position,
                'is_done' => (bool) $task->is_done,
                'is_verified' => (bool) $task->is_verified,
                'is_kpi_task' => (bool) $task->is_kpi_task,
                'creator' => $task->creator ? [
                    'id' => $task->creator->id,
                    'name' => $task->creator->name,
                    'avatar_url' => $task->creator->avatar_url,
                ] : null,
                'tags' => $task->tags->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'color' => $t->color,
                ])->toArray(),
                'assignees' => $task->assignees->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'avatar_url' => $a->avatar_url,
                ])->toArray(),
                'media' => $task->getMedia('*')->map(fn ($m) => [
                    'id' => $m->id,
                    'file_name' => $m->file_name,
                    'mime_type' => $m->mime_type,
                    'original_url' => $m->getUrl(),
                    'size' => $m->size,
                ])->toArray(),
                'comments' => $commentsData->toArray(),
                'comments_count' => $task->comments()->count(),
                'media_count' => $task->media()->count(),
            ],
            'comments' => [
                'data' => $commentsData->toArray(),
                'current_page' => $paginatedComments->currentPage(),
                'last_page' => $paginatedComments->lastPage(),
                'total' => $paginatedComments->total(),
            ],
        ]);
    }

    public function update(Request $request, Task $task)
    {
        Gate::authorize('update', $task);

        $currentKanbanId = $task->kanbanColumn()->value('kanban_id');

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'store_id' => 'nullable|exists:stores,id',
            'visit_date' => 'nullable|date',
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

        try {
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
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal memperbarui task, silakan coba lagi.']);
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

        try {
            DB::transaction(fn () => $task->delete());
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menghapus task, silakan coba lagi.']);
        }

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
