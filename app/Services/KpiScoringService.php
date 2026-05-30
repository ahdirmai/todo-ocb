<?php

namespace App\Services;

use App\Models\KpiDailyScore;
use App\Models\KpiMonthlyScore;
use App\Models\KpiWeeklyScore;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class KpiScoringService
{
    public function calculateDailyScore(User $user, CarbonInterface $date): KpiDailyScore
    {
        $scoreDate = $date->toDateString();
        $team = $user->teams()->where('is_spv_team', true)->first();

        if (! $team || ! $user->position_id) {
            throw new \Exception('User must have position and be in SPV team');
        }

        $tasks = Task::where('is_kpi_task', true)
            ->where('team_id', $team->id)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $scoreDate)
            ->with(['kpiDefinition', 'comments'])
            ->get();

        $totalTasks = $tasks->count();
        $completedTasks = 0;
        $verifiedTasks = 0;
        $completedWeight = 0;
        $categoryBreakdown = [];
        $taskDetails = [];

        foreach ($tasks as $task) {
            $definition = $task->kpiDefinition;
            if (! $definition) {
                continue;
            }

            $category = $definition->category;
            if (! isset($categoryBreakdown[$category])) {
                $categoryBreakdown[$category] = [
                    'total_weight' => 0,
                    'completed_weight' => 0,
                    'total_tasks' => 0,
                    'completed_tasks' => 0,
                ];
            }

            $categoryBreakdown[$category]['total_weight'] += (float) $definition->weight;
            $categoryBreakdown[$category]['total_tasks']++;

            $evidenceStatus = $this->verifyTaskEvidence($task);
            $weightMultiplier = 0;

            if ($evidenceStatus === 'full') {
                $weightMultiplier = 1.0; // 100% weight
                if (! $task->is_verified) {
                    $task->update([
                        'is_verified' => true,
                        'verified_at' => now(),
                    ]);
                }
            } elseif ($evidenceStatus === 'partial') {
                $weightMultiplier = 0.3; // 30% weight
            }

            if ($weightMultiplier > 0) {
                $completedTasks++;
                if ($evidenceStatus === 'full') {
                    $verifiedTasks++;
                }
                $earnedWeight = (float) $definition->weight * $weightMultiplier;
                $completedWeight += $earnedWeight;
                $categoryBreakdown[$category]['completed_weight'] += $earnedWeight;
                $categoryBreakdown[$category]['completed_tasks']++;
            }

            $taskDetails[] = [
                'task_id' => $task->id,
                'task_name' => $definition->task_name,
                'category' => $category,
                'weight' => $definition->weight,
                'completed' => $weightMultiplier > 0,
                'verified' => $evidenceStatus === 'full',
                'evidence_status' => $evidenceStatus,
            ];
        }

        $totalScore = min($completedWeight, 100);
        $grade = $this->determineGrade($totalScore);

        return KpiDailyScore::updateOrCreate(
            [
                'user_id' => $user->id,
                'score_date' => $scoreDate,
            ],
            [
                'position_id' => $user->position_id,
                'team_id' => $team->id,
                'total_score' => $totalScore,
                'completed_weight' => $completedWeight,
                'total_weight' => 100,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'verified_tasks' => $verifiedTasks,
                'grade' => $grade,
                'category_breakdown' => $categoryBreakdown,
                'task_details' => $taskDetails,
            ]
        );
    }

    public function calculateWeeklyScore(User $user, CarbonInterface $weekStart): KpiWeeklyScore
    {
        $weekStart = $weekStart->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        if (! $user->position_id) {
            throw new \Exception('User must have position');
        }

        $dailyScores = KpiDailyScore::where('user_id', $user->id)
            ->whereBetween('score_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get();

        if ($dailyScores->isEmpty()) {
            throw new \Exception('No daily scores found for this week');
        }

        $averageScore = $dailyScores->avg('total_score');
        $grade = $this->determineGrade($averageScore);

        $dailyScoresData = $dailyScores->map(fn ($score) => [
            'date' => $score->score_date,
            'score' => $score->total_score,
            'grade' => $score->grade,
        ])->toArray();

        $categoryBreakdown = $this->aggregateCategoryBreakdown($dailyScores);

        return KpiWeeklyScore::updateOrCreate(
            [
                'user_id' => $user->id,
                'week_start_date' => $weekStart->toDateString(),
            ],
            [
                'position_id' => $user->position_id,
                'week_end_date' => $weekEnd->toDateString(),
                'average_score' => round($averageScore, 2),
                'grade' => $grade,
                'daily_scores' => $dailyScoresData,
                'category_breakdown' => $categoryBreakdown,
            ]
        );
    }

    public function calculateMonthlyScore(User $user, CarbonInterface $month): KpiMonthlyScore
    {
        $monthStart = $month->copy()->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();

        if (! $user->position_id) {
            throw new \Exception('User must have position');
        }

        $weeklyScores = KpiWeeklyScore::where('user_id', $user->id)
            ->where(function ($q) use ($monthStart, $monthEnd) {
                $q->whereBetween('week_start_date', [$monthStart, $monthEnd])
                    ->orWhereBetween('week_end_date', [$monthStart, $monthEnd]);
            })
            ->get();

        if ($weeklyScores->isEmpty()) {
            throw new \Exception('No weekly scores found for this month');
        }

        $averageScore = $weeklyScores->avg('average_score');

        $dailyScores = KpiDailyScore::where('user_id', $user->id)
            ->whereBetween('score_date', [$monthStart, $monthEnd])
            ->get();

        $hasGradeD = $dailyScores->contains('grade', 'D');
        $consistencyBonus = $hasGradeD ? 0 : 5;
        $finalScore = min($averageScore + $consistencyBonus, 100);

        $grade = $this->determineGrade($finalScore);

        $weeklyScoresData = $weeklyScores->map(fn ($score) => [
            'week_start' => $score->week_start_date,
            'week_end' => $score->week_end_date,
            'score' => $score->average_score,
            'grade' => $score->grade,
        ])->toArray();

        $categoryBreakdown = $this->aggregateCategoryBreakdown($dailyScores);

        return KpiMonthlyScore::updateOrCreate(
            [
                'user_id' => $user->id,
                'month' => $monthStart->toDateString(),
            ],
            [
                'position_id' => $user->position_id,
                'average_score' => round($averageScore, 2),
                'consistency_bonus' => $consistencyBonus,
                'final_score' => round($finalScore, 2),
                'grade' => $grade,
                'has_grade_d' => $hasGradeD,
                'weekly_scores' => $weeklyScoresData,
                'category_breakdown' => $categoryBreakdown,
            ]
        );
    }

    public function verifyTaskEvidence(Task $task): string
    {
        // Manager HR and Manager Operasional bypass comment requirement
        $creator = $task->creator;
        if ($creator && $creator->jobPosition) {
            $positionName = $creator->jobPosition->name;
            if (in_array($positionName, ['Manager HR', 'Manager Operasional'])) {
                return 'full'; // Managers always get full weight
            }
        }

        $commentCount = $task->comments()->count();
        $hasMedia = $task->comments()->whereHas('media')->exists();

        if ($commentCount > 0 && $hasMedia) {
            return 'full'; // Comment + attachment = 100% weight
        }

        if ($commentCount > 0) {
            return 'partial'; // Only comment = 30% weight
        }

        return 'none'; // No comment = 0% weight
    }

    public function determineGrade(float $score): string
    {
        if ($score >= 95) {
            return 'A+';
        }
        if ($score >= 85) {
            return 'A';
        }
        if ($score >= 70) {
            return 'B';
        }
        if ($score >= 50) {
            return 'C';
        }

        return 'D';
    }

    protected function aggregateCategoryBreakdown(Collection $scores): array
    {
        $aggregated = [];

        foreach ($scores as $score) {
            $breakdown = $score->category_breakdown ?? [];
            foreach ($breakdown as $category => $data) {
                if (! isset($aggregated[$category])) {
                    $aggregated[$category] = [
                        'total_weight' => 0,
                        'completed_weight' => 0,
                        'total_tasks' => 0,
                        'completed_tasks' => 0,
                    ];
                }

                $aggregated[$category]['total_weight'] += $data['total_weight'] ?? 0;
                $aggregated[$category]['completed_weight'] += $data['completed_weight'] ?? 0;
                $aggregated[$category]['total_tasks'] += $data['total_tasks'] ?? 0;
                $aggregated[$category]['completed_tasks'] += $data['completed_tasks'] ?? 0;
            }
        }

        foreach ($aggregated as $category => $data) {
            if ($data['total_weight'] > 0) {
                $aggregated[$category]['completion_percentage'] = round(
                    ($data['completed_weight'] / $data['total_weight']) * 100,
                    2
                );
            }
        }

        return $aggregated;
    }
}
