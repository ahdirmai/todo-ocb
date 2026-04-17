<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'parent_id' => 'nullable|exists:comments,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
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

    public function destroy(Comment $comment)
    {
        if ($comment->user_id === auth()->id() || auth()->user()?->hasAnyRole(['admin', 'superadmin'])) {
            $task = $comment->task; // Assuming comment belongs to a task, we need it for logging
            $comment->delete();

            if ($task) {
                ActivityLogger::log(
                    event: 'comment_deleted',
                    logName: 'task',
                    description: "Komentar dihapus pada task \"{$task->title}\"",
                    subject: $task,
                    teamId: $task->team_id,
                );
            }
        }

        return back();
    }
}
