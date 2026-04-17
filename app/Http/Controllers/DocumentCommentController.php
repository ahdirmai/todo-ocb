<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Team;
use Illuminate\Http\Request;

class DocumentCommentController extends Controller
{
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
}
