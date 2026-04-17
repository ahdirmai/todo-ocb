<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Announcement;
use App\Models\Team;
use Illuminate\Support\Facades\Gate;
use App\Services\ActivityLogger;

class AnnouncementController extends Controller
{
    public function store(Request $request, Team $team)
    {
        // Must be a team member
        abort_unless($team->users()->where('user_id', request()->user()->id)->exists(), 403);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
            'attachments.*' => 'nullable|file',
        ]);

        $announcement = $team->announcements()->create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $announcement->addMedia($file)->toMediaCollection('attachments');
            }
        }

        ActivityLogger::log(
            event: 'created',
            logName: 'announcement',
            description: "Membuat pengumuman baru",
            subject: $announcement,
            teamId: $team->id,
            properties: ['title' => $announcement->title]
        );

        // Feature placeholder for notifications
        // event(new \App\Events\AnnouncementCreated($announcement));

        return back();
    }

    public function update(Request $request, Announcement $announcement)
    {
        Gate::authorize('update', $announcement);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
        ]);

        $announcement->update([
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'],
        ]);

        ActivityLogger::log(
            event: 'updated',
            logName: 'announcement',
            description: "Memperbarui pengumuman",
            subject: $announcement,
            teamId: $announcement->team_id,
            properties: ['title' => $announcement->title]
        );

        return back();
    }

    public function destroy(Announcement $announcement)
    {
        Gate::authorize('delete', $announcement);
        
        $teamId = $announcement->team_id;
        $title = $announcement->title;
        
        $announcement->delete();

        ActivityLogger::log(
            event: 'deleted',
            logName: 'announcement',
            description: "Menghapus pengumuman",
            subject: null,
            teamId: $teamId,
            properties: ['title' => $title]
        );

        return back();
    }
}
