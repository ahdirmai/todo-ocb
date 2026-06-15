<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'max:50'],
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $feedback = Feedback::create([
            'feedback_cycle_id' => null,
            'user_id' => $request->user()->id,
            'category' => $validated['category'] ?? null,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'rating' => $validated['rating'] ?? null,
        ]);

        ActivityLogger::log(
            event: 'created',
            logName: 'feedback',
            description: "Quick feedback \"{$feedback->subject}\" dari {$request->user()->name}",
            subject: $feedback,
        );

        return back()->with('success', 'Terima kasih! Feedback Anda sudah kami terima.');
    }
}
