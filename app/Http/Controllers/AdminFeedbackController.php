<?php

namespace App\Http\Controllers;

use App\Exports\FeedbackExport;
use App\Models\Feedback;
use App\Models\FeedbackCycle;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminFeedbackController extends Controller
{
    public function index(): Response
    {
        $activeCycle = FeedbackCycle::where('is_open', true)->first();

        $cycles = FeedbackCycle::withCount('feedback')
            ->latest()
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'is_open' => $c->is_open,
                'opened_at' => $c->opened_at?->toDateTimeString(),
                'closed_at' => $c->closed_at?->toDateTimeString(),
                'feedback_count' => $c->feedback_count,
                'created_by' => $c->creator?->name,
            ]);

        $allFeedback = Feedback::with('user.jobPosition')
            ->latest()
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'cycle_id' => $f->feedback_cycle_id,
                'user' => $f->user ? [
                    'id' => $f->user->id,
                    'name' => $f->user->name,
                    'email' => $f->user->email,
                    'position' => $f->user->jobPosition?->name,
                ] : null,
                'category' => $f->category,
                'subject' => $f->subject,
                'message' => $f->message,
                'rating' => $f->rating,
                'survey_data' => $f->survey_data,
                'is_survey' => $f->category === 'survey',
                'created_at' => $f->created_at->toDateTimeString(),
            ]);

        return Inertia::render('feedback/index', [
            'activeCycle' => $activeCycle ? [
                'id' => $activeCycle->id,
                'title' => $activeCycle->title,
                'description' => $activeCycle->description,
                'opened_at' => $activeCycle->opened_at?->toDateTimeString(),
            ] : null,
            'cycles' => $cycles,
            'feedback' => $allFeedback,
        ]);
    }

    public function openCycle(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        // Close any currently open cycle
        FeedbackCycle::where('is_open', true)->update([
            'is_open' => false,
            'closed_at' => now(),
        ]);

        $cycle = FeedbackCycle::create([
            'is_open' => true,
            'title' => $validated['title'] ?? 'Sesi Feedback',
            'description' => $validated['description'] ?? null,
            'opened_at' => now(),
            'created_by' => $request->user()->id,
        ]);

        ActivityLogger::log(
            event: 'created',
            logName: 'feedback_cycle',
            description: "Sesi feedback \"{$cycle->title}\" dibuka",
            subject: $cycle,
        );

        return back()->with('success', 'Sesi feedback berhasil dibuka.');
    }

    public function closeCycle(FeedbackCycle $cycle): RedirectResponse
    {
        $cycle->update([
            'is_open' => false,
            'closed_at' => now(),
        ]);

        ActivityLogger::log(
            event: 'updated',
            logName: 'feedback_cycle',
            description: "Sesi feedback \"{$cycle->title}\" ditutup",
            subject: $cycle,
        );

        return back()->with('success', 'Sesi feedback ditutup.');
    }

    public function export()
    {
        $path = tempnam(sys_get_temp_dir(), 'feedback-export');
        $export = new FeedbackExport;
        $export->download($path);

        return response()->download($path, 'feedback-'.now()->toDateString().'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
