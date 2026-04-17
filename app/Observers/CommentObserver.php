<?php

namespace App\Observers;

use App\Models\Comment;
use App\Services\ActivityLogger;

class CommentObserver
{
    public function created(Comment $comment): void
    {
        ActivityLogger::log(
            event: 'created',
            logName: 'comment',
            description: 'Komentar ditambahkan pada task',
            subject: $comment,
            teamId: $comment->task?->team_id,
        );
    }

    public function deleted(Comment $comment): void
    {
        ActivityLogger::log(
            event: 'deleted',
            logName: 'comment',
            description: 'Komentar dihapus dari task',
            subject: $comment,
            teamId: $comment->task?->team_id,
        );
    }
}
