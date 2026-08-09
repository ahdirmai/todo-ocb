<?php

namespace App\Jobs;

use App\Models\Task;
use App\Services\AiTaskCheckService;
use App\Services\KpiScoringService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;

class CheckTaskComplianceJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 90;

    public int $tries = 1;

    private const MAX_ATTEMPTS = 3;

    private const PASS_THRESHOLD = 75.0;

    public function __construct(public readonly string $taskId) {}

    public function handle(AiTaskCheckService $ai, KpiScoringService $scoring): void
    {
        $task = Task::with('kpiDefinition', 'creator')->find($this->taskId);

        if (! $task || ! $task->is_kpi_task || ! $task->kpiDefinition) {
            return;
        }

        if (! config('services.openai.task_check_enabled', true)) {
            return;
        }

        if ($task->ai_check_status !== 'pending' || $task->ai_check_attempts >= self::MAX_ATTEMPTS) {
            return;
        }

        $commentText = $task->comments()->pluck('content')->implode("\n");

        try {
            $result = $ai->scoreCompliance($task->kpiDefinition, $commentText);
        } catch (RuntimeException $e) {
            // System/API failure — do NOT burn an attempt; let the user retry.
            report($e);
            $task->update([
                'ai_check_status' => 'failed',
                'ai_check_feedback' => 'Gagal cek AI karena kendala sistem. Silakan submit ulang.',
                'ai_checked_at' => now(),
            ]);

            return;
        }

        // AI returns a final compliance score of 0–100 directly. Evidence
        // structure (comment + photo) is already verified as "full" before the
        // job runs; the AI scores how well the content matches the task's
        // work_method & verification_method, and is instructed to be lenient so
        // genuinely compliant evidence easily reaches 95–100.
        $totalScore = max(0.0, min(100.0, (float) $result['score']));
        $attempts = $task->ai_check_attempts + 1;

        // score >= 75 → accepted (verified, full weight)
        // score <  75 → rejected; user fixes and resubmits until attempts run out
        // attempts exhausted without passing → partial credit (score/100 × weight)
        $status = match (true) {
            $totalScore >= self::PASS_THRESHOLD => 'passed',
            $attempts >= self::MAX_ATTEMPTS => 'exhausted',
            default => 'failed',
        };

        // Failed / exhausted results must always carry a reason. If the AI
        // returned an empty feedback, provide a sensible fallback so the user
        // is never left without an explanation.
        $feedback = trim($result['feedback']);
        if ($feedback === '' && $status !== 'passed') {
            $feedback = 'Bukti belum menjelaskan cara kerja & verifikasi task dengan cukup jelas. Lengkapi komentar lalu submit ulang.';
        }

        $task->update([
            'ai_compliance_score' => $totalScore,
            'ai_check_feedback' => $feedback,
            'ai_check_attempts' => $attempts,
            'ai_checked_at' => now(),
            'ai_check_status' => $status,
            'is_verified' => $status === 'passed',
            'verified_at' => $status === 'passed' ? now() : null,
        ]);

        $this->recomputeScores($scoring, $task);
    }

    private function recomputeScores(KpiScoringService $scoring, Task $task): void
    {
        $user = $task->creator;
        if (! $user) {
            return;
        }

        $taskDate = $task->created_at;

        try {
            $scoring->calculateDailyScore($user, $taskDate);
        } catch (\Exception $e) {
            report($e);
        }

        try {
            $scoring->calculateWeeklyScore($user, $taskDate->copy()->startOfWeek(Carbon::MONDAY));
        } catch (\Exception $e) {
            // Weekly score may fail without enough daily scores.
        }

        try {
            $scoring->calculateMonthlyScore($user, $taskDate);
        } catch (\Exception $e) {
            // Monthly score may fail without enough weekly scores.
        }
    }
}
