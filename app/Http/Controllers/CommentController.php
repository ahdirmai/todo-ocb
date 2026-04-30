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
            'attachment_dates' => 'nullable|array',
            'attachment_dates.*' => 'date',
        ]);

        if (!empty($validated['attachment_dates'])) {
            foreach ($validated['attachment_dates'] as $date) {
                $fileDate = \Carbon\Carbon::parse($date);
                if ($fileDate->diffInHours(now()) > 24) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'attachments' => 'File/foto tidak valid: Bukti yang dilampirkan dibuat lebih dari 1 hari yang lalu.',
                    ]);
                }
            }
        }

        $comment = $task->comments()->create([
            'user_id' => $request->user()?->id,
            'content' => $validated['content'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if ($request->hasFile('attachments')) {
            $dates = $validated['attachment_dates'] ?? [];
            foreach ($request->file('attachments') as $index => $file) {
                $media = $comment->addMedia($file);
                if (isset($dates[$index])) {
                    $media->withCustomProperties(['original_date_created' => $dates[$index]]);
                }
                $media->toMediaCollection('documents');
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
            'new_attachment_dates' => 'nullable|array',
            'new_attachment_dates.*' => 'date',
            'removed_media_ids' => 'nullable|array',
            'removed_media_ids.*' => 'integer',
        ]);

        if (!empty($validated['new_attachment_dates'])) {
            foreach ($validated['new_attachment_dates'] as $date) {
                $fileDate = \Carbon\Carbon::parse($date);
                if ($fileDate->diffInHours(now()) > 24) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'attachments' => 'File/foto tidak valid: Bukti yang dilampirkan dibuat lebih dari 1 hari yang lalu.',
                    ]);
                }
            }
        }

        $comment->update(['content' => $validated['content']]);

        if (! empty($validated['removed_media_ids'])) {
            $comment->media()->whereIn('id', $validated['removed_media_ids'])->delete();
        }

        if ($request->hasFile('new_attachments')) {
            $dates = $validated['new_attachment_dates'] ?? [];
            foreach ($request->file('new_attachments') as $index => $file) {
                $media = $comment->addMedia($file);
                if (isset($dates[$index])) {
                    $media->withCustomProperties(['original_date_created' => $dates[$index]]);
                }
                $media->toMediaCollection('documents');
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
