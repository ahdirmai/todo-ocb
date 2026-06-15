<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\FeedbackCycle;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SurveyController extends Controller
{
    public function create(): Response
    {
        $cycle = FeedbackCycle::where('is_open', true)->first();

        if (! $cycle) {
            return Inertia::render('survey/index', [
                'survey' => null,
                'message' => 'Tidak ada sesi survey yang aktif.',
                'cycle' => null,
            ]);
        }

        $existing = Feedback::where('feedback_cycle_id', $cycle->id)
            ->where('user_id', request()->user()->id)
            ->first();

        return Inertia::render('survey/index', [
            'survey' => $existing ? [
                'id' => $existing->id,
                'survey_data' => $existing->survey_data,
                'created_at' => $existing->created_at->toDateTimeString(),
            ] : null,
            'message' => $existing ? 'Anda sudah mengisi survey di sesi ini.' : null,
            'cycle' => [
                'id' => $cycle->id,
                'title' => $cycle->title,
                'description' => $cycle->description,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $cycle = FeedbackCycle::where('is_open', true)->first();

        if (! $cycle) {
            return back()->withErrors(['error' => 'Tidak ada sesi survey yang aktif.']);
        }

        $user = $request->user();

        $exists = Feedback::where('feedback_cycle_id', $cycle->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($exists) {
            return back()->withErrors(['error' => 'Anda sudah mengisi survey di sesi ini.']);
        }

        $validated = $request->validate([
            'experience' => ['required', 'integer', 'min:1', 'max:5'],
            'usage_duration' => ['required', 'string', 'in:<1,1-3,>3'],
            'most_used_features' => ['nullable', 'array'],
            'most_used_features.*' => ['string', 'max:50'],
            'most_helpful_feature' => ['nullable', 'string', 'max:2000'],
            'technical_issues' => ['nullable', 'array'],
            'technical_issues.*' => ['string', 'max:50'],
            'other_issue' => ['nullable', 'string', 'max:2000'],
            'data_loss' => ['nullable', 'string', 'in:tidak,1-2,sering'],
            'role_specific' => ['nullable', 'array'],
            'desired_features' => ['nullable', 'array'],
            'desired_features.*' => ['string', 'max:100'],
            'custom_feature_request' => ['nullable', 'string', 'max:2000'],
            'suggestions' => ['nullable', 'string', 'max:5000'],
        ]);

        $feedback = Feedback::create([
            'feedback_cycle_id' => $cycle->id,
            'user_id' => $user->id,
            'category' => 'survey',
            'subject' => 'Survey Penggunaan Aplikasi',
            'message' => $validated['suggestions'] ?? '',
            'rating' => $validated['experience'],
            'survey_data' => $validated,
        ]);

        ActivityLogger::log(
            event: 'created',
            logName: 'survey',
            description: "Survey dari {$user->name} — rating {$validated['experience']}/5",
            subject: $feedback,
        );

        return back()->with('success', 'Terima kasih! Survey Anda sudah kami terima.');
    }
}
