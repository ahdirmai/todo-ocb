<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    private function attachmentMaxKilobytes(): int
    {
        return (int) config('uploads.documents.max_file_kb');
    }

    public function store(Request $request, Task $task)
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'parent_id' => 'nullable|exists:comments,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
        ]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()?->id,
            'content' => $validated['content'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $comment->addMedia($file)->toMediaCollection('documents');
            }
        }

        ActivityLogger::log(
            event: 'commented',
            logName: 'task',
            description: "Komentar baru ditambahkan pada task \"{$task->title}\"",
            subject: $task,
            teamId: $task->team_id,
        );

        return back();
    }

    public function storeAnnouncement(Request $request, Announcement $announcement)
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'parent_id' => 'nullable|exists:comments,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
        ]);

        $comment = $announcement->comments()->create([
            'user_id' => $request->user()?->id,
            'content' => $validated['content'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $comment->addMedia($file)->toMediaCollection('documents');
            }
        }

        ActivityLogger::log(
            event: 'commented',
            logName: 'announcement',
            description: 'Komentar baru ditambahkan pada pengumuman',
            subject: $announcement,
            teamId: $announcement->team_id,
        );

        return back();
    }

    public function update(Request $request, Comment $comment)
    {
        abort_unless($comment->user_id === auth()->id(), 403);

        $validated = $request->validate([
            'content' => 'required|string',
            'new_attachments' => 'nullable|array',
            'new_attachments.*' => 'file|max:'.$this->attachmentMaxKilobytes(),
            'removed_media_ids' => 'nullable|array',
            'removed_media_ids.*' => 'integer',
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

        return back();
    }

    public function destroy(Comment $comment)
    {
        if ($comment->user_id === auth()->id() || auth()->user()?->hasAnyRole(['admin', 'superadmin'])) {
            $task = $comment->task; // Assuming comment belongs to a task, we need it for logging
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
        }

        return back();
    }
}
