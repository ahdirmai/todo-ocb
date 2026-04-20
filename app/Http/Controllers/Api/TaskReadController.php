<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TeamTaskIndexRequest;
use App\Http\Resources\Api\TaskDetailResource;
use App\Http\Resources\Api\TaskSummaryResource;
use App\Models\Task;
use App\Models\Team;

class TaskReadController extends Controller
{
    public function index(TeamTaskIndexRequest $request, Team $team)
    {
        $tasks = Task::query()
            ->whereBelongsTo($team)
            ->with(['kanbanColumn', 'tags', 'assignees'])
            ->withCount(['comments', 'media'])
            ->when(
                $request->filled('kanban_id'),
                fn ($query) => $query->whereHas('kanbanColumn', fn ($columnQuery) => $columnQuery->where('kanban_id', $request->string('kanban_id')->toString()))
            )
            ->when(
                $request->filled('column_id'),
                fn ($query) => $query->where('kanban_column_id', $request->string('column_id')->toString())
            )
            ->when(
                $request->filled('assignee_id'),
                fn ($query) => $query->whereHas('assignees', fn ($assigneeQuery) => $assigneeQuery->whereKey($request->integer('assignee_id')))
            )
            ->when(
                $request->filled('tag_id'),
                fn ($query) => $query->whereHas('tags', fn ($tagQuery) => $tagQuery->whereKey($request->string('tag_id')->toString()))
            )
            ->when(
                $request->filled('due_before'),
                fn ($query) => $query->whereDate('due_date', '<=', $request->date('due_before'))
            )
            ->when(
                $request->filled('due_after'),
                fn ($query) => $query->whereDate('due_date', '>=', $request->date('due_after'))
            )
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where(function ($searchQuery) use ($request) {
                    $term = $request->string('search')->trim()->toString();

                    $searchQuery
                        ->where('title', 'like', '%'.$term.'%')
                        ->orWhere('description', 'like', '%'.$term.'%');
                })
            )
            ->orderBy('kanban_column_id')
            ->orderBy('order_position')
            ->paginate($request->integer('per_page', 25));

        return TaskSummaryResource::collection($tasks);
    }

    public function show(Task $task)
    {
        $task->load([
            'creator',
            'kanbanColumn.kanban',
            'tags',
            'assignees',
            'media',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->with(['user', 'media', 'replies.user', 'replies.media'])
                ->latest(),
        ]);

        return TaskDetailResource::make($task);
    }
}
