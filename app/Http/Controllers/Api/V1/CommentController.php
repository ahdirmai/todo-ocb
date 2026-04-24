<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    private function attachmentMaxKilobytes(): int
    {
        return (int) config('uploads.documents.max_file_kb');
    }

    public function storeTask(Request $request, Task $task)
    {
        Gate::authorize('view', $task);

        return $this->store($request, function (array $validated) use ($request, $task) {
            return $task->comments()->create([
                'user_id' => $request->user()->id,
                'content' => $validated['content'],
                'parent_id' => $validated['parent_id'] ?? null,
            ]);
        }, function () use ($task) {
            ActivityLogger::log(
                event: 'commented',
                logName: 'task',
                description: "Komentar baru ditambahkan pada task \"{$task->title}\"",
                subject: $task,
                teamId: $task->team_id,
            );
        });
    }

    public function storeAnnouncement(Request $request, Announcement $announcement)
    {
        Gate::authorize('view', $announcement);

        return $this->store($request, function (array $validated) use ($request, $announcement) {
            return $announcement->comments()->create([
                'user_id' => $request->user()->id,
                'content' => $validated['content'],
                'parent_id' => $validated['parent_id'] ?? null,
            ]);
        }, function () use ($announcement) {
            ActivityLogger::log(
                event: 'commented',
                logName: 'announcement',
                description: 'Komentar baru ditambahkan pada pengumuman',
                subject: $announcement,
                teamId: $announcement->team_id,
            );
        });
    }

    public function update(Request $request, Comment $comment)
    {
        abort_unless($comment->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'content' => ['required', 'string'],
            'new_attachments' => ['nullable', 'array'],
            'new_attachments.*' => ['file', 'max:'.$this->attachmentMaxKilobytes()],
            'removed_media_ids' => ['nullable', 'array'],
            'removed_media_ids.*' => ['integer'],
        ]);

        $comment->update(['content' => $validated['content']]);

        if (! empty($validated['removed_media_ids'])) {
            $comment->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        if ($request->hasFile('new_attachments')) {
            foreach ($request->file('new_attachments') as $file) {
                $comment->addMedia($file)->toMediaCollection('documents');
            }
        }

        return response()->json([
            'message' => 'Comment updated successfully.',
            'data' => [
                'id' => $comment->id,
                'content' => $comment->content,
            ],
        ]);
    }

    public function destroy(Request $request, Comment $comment)
    {
        abort_unless(
            $comment->user_id === $request->user()->id || $request->user()->hasAnyRole(['admin', 'superadmin']),
            403,
        );

        $task = $comment->task;
        $announcement = $comment->announcement;
        $comment->delete();

        if ($task) {
            ActivityLogger::log(
                event: 'comment_deleted',
                logName: 'task',
                description: "Komentar dihapus pada task \"{$task->title}\"",
                subject: $task,
                teamId: $task->team_id,
            );
        } elseif ($announcement) {
            ActivityLogger::log(
                event: 'comment_deleted',
                logName: 'announcement',
                description: 'Komentar dihapus pada pengumuman',
                subject: $announcement,
                teamId: $announcement->team_id,
            );
        }

        return response()->noContent();
    }

    private function store(Request $request, callable $creator, callable $afterCreate)
    {
        $validated = $request->validate([
            'content' => ['required', 'string'],
            'parent_id' => ['nullable', 'exists:comments,id'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:'.$this->attachmentMaxKilobytes()],
        ]);

        /** @var Comment $comment */
        $comment = $creator($validated);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $comment->addMedia($file)->toMediaCollection('documents');
            }
        }

        $afterCreate();

        return response()->json([
            'message' => 'Comment created successfully.',
            'data' => [
                'id' => $comment->id,
                'content' => $comment->content,
            ],
        ], 201);
    }
}
