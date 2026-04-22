<?php

namespace App\Http\Controllers;

use App\Events\TeamMessageSent;
use App\Models\Team;
use App\Models\TeamMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class TeamMessageController extends Controller
{
    /**
     * Check if the authenticated user is a member of the given team.
     * Aborts with 403 if not.
     */
    private function authorizeTeamMember(Team $team): void
    {
        if (! $team->users()->where('team_user.user_id', auth()->id())->exists()) {
            abort(403, 'Anda bukan anggota tim ini.');
        }
    }

    /**
     * Return the 50 most recent messages for a team (chronological order).
     */
    public function index(Team $team): JsonResponse
    {
        $this->authorizeTeamMember($team);

        $messages = TeamMessage::with('user')
            ->where('team_id', $team->id)
            ->latest()
            ->limit(50)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (TeamMessage $msg) => $this->formatMessage($msg));

        return response()->json($messages);
    }

    /**
     * Store a new team message and broadcast it to all channel subscribers.
     */
    public function store(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamMember($team);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:4000'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:20480'], // 20 MB per file
        ]);

        // Require at least body or attachment
        if (empty($validated['body']) && ! $request->hasFile('attachments')) {
            return response()->json(['error' => 'Pesan tidak boleh kosong.'], 422);
        }

        $message = TeamMessage::create([
            'team_id' => $team->id,
            'user_id' => auth()->id(),
            'body' => $validated['body'] ?? null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $message->addMedia($file)->toMediaCollection('attachments');
            }
        }

        $message->load('user');

        broadcast(new TeamMessageSent($message))->toOthers();

        return response()->json($this->formatMessage($message), 201);
    }

    /**
     * Serve a protected media file — accessible only to team members.
     */
    public function download(TeamMessage $message, Media $media): mixed
    {
        $team = $message->team;
        $this->authorizeTeamMember($team);

        // Verify the media belongs to this message
        if ($media->model_id !== $message->id) {
            abort(404);
        }

        return response()->download($media->getPath(), $media->file_name);
    }

    /**
     * Format a TeamMessage for JSON responses.
     *
     * @return array<string, mixed>
     */
    private function formatMessage(TeamMessage $message): array
    {
        $user = $message->user;

        return [
            'id' => $message->id,
            'body' => $message->body,
            'created_at' => $message->created_at->toISOString(),
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'avatar_url' => $user->avatar_url,
            ] : null,
            'attachments' => $message->getMedia('attachments')->map(fn (Media $media) => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
                'mime' => $media->mime_type,
                'size' => $media->size,
            ])->toArray(),
        ];
    }
}
