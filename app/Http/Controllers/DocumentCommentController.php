<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Document;
use App\Models\Team;
use Illuminate\Http\Request;

class DocumentCommentController extends Controller
{
    private function attachmentMaxKilobytes(): int
    {
        return (int) config('uploads.documents.max_file_kb');
    }

    public function store(Request $request, Team $team, Document $document)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $document->comments()->create([
            'user_id' => $request->user()->id,
            'content' => $validated['content'],
        ]);

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
}
