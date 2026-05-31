<?php

namespace App\Services;

use App\Models\KpiDailyReport;
use App\Models\KpiDailyScore;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonInterface;

class KpiReportingService
{
    public function createDailyReport(User $user, array $data): KpiDailyReport
    {
        $team = $user->teams()->where('is_spv_team', true)->first();

        $reportDate = $data['report_date'] ?? now()->toDateString();
        $submittedAt = $data['submitted_at'] ?? now();
        $isLate = $this->checkReportDeadline($submittedAt);

        return KpiDailyReport::updateOrCreate(
            [
                'user_id' => $user->id,
                'report_date' => $reportDate,
            ],
            [
                'team_id' => $team?->id,
                'status_34_tasks' => $data['status_34_tasks'] ?? null,
                'spv_status' => $data['spv_status'] ?? null,
                'issues_today' => $data['issues_today'] ?? null,
                'follow_up' => $data['follow_up'] ?? null,
                'action_plan' => $data['action_plan'] ?? null,
                'report_data' => $data['report_data'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'submitted_at' => $submittedAt,
                'is_late' => $isLate,
            ]
        );
    }

    public function getDailyReportTemplate(User $user, CarbonInterface $date): array
    {
        $team = $user->teams()->where('is_spv_team', true)->first();

        // For managers without team, query by creator_id only
        $tasksQuery = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $date->toDateString())
            ->with(['kpiDefinition', 'kanbanColumn']);

        if ($team) {
            $tasksQuery->where('team_id', $team->id);
        }

        $tasks = $tasksQuery->get();

        $totalTasks = $tasks->count();
        $completedTasks = $tasks->filter(fn ($task) => $task->kanbanColumn?->is_done)->count();
        $verifiedTasks = $tasks->filter(fn ($task) => $task->is_verified)->count();

        $dailyScore = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $date->toDateString())
            ->first();

        return [
            'report_date' => $date->toDateString(),
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'verified_tasks' => $verifiedTasks,
            'completion_percentage' => $totalTasks > 0 ? round(($verifiedTasks / $totalTasks) * 100, 2) : 0.0,
            'total_score' => $dailyScore ? (float) $dailyScore->total_score : 0.0,
            'grade' => $dailyScore?->grade ?? '-',
            'category_breakdown' => $dailyScore?->category_breakdown ?? [],
        ];
    }

    public function checkReportDeadline(CarbonInterface $submittedAt): bool
    {
        $deadline = $submittedAt->copy()->setTime(22, 30, 0);

        return $submittedAt->isAfter($deadline);
    }
}
