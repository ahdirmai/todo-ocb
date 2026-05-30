<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyScore;
use App\Models\KpiMonthlyScore;
use App\Models\KpiWeeklyScore;
use App\Models\Task;
use App\Services\KpiScoringService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiDashboardController extends Controller
{
    public function __construct(protected KpiScoringService $scoringService) {}

    protected function getPositionArea(): string
    {
        $user = auth()->user();
        $positionName = $user->jobPosition?->name;

        return match ($positionName) {
            'Manager HR' => 'hr',
            'Manager Operasional' => 'operational',
            default => throw new \Exception('Position tidak memiliki akses KPI'),
        };
    }

    public function index(): Response
    {
        $user = auth()->user();
        $today = now()->toDateString();

        $team = $user->teams()->where('is_spv_team', true)->first();

        if (! $team) {
            $area = $this->getPositionArea();

            return Inertia::render("{$area}/kpi/no-access", [
                'message' => 'Anda tidak terdaftar dalam tim SPV',
            ]);
        }

        $todayScore = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $today)
            ->first();

        $todayTasks = Task::where('is_kpi_task', true)
            ->where('team_id', $team->id)
            ->whereDate('created_at', $today)
            ->with(['kpiDefinition', 'kanbanColumn', 'comments'])
            ->orderBy('order_position')
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'category' => $task->kpiDefinition?->category,
                    'task_name' => $task->kpiDefinition?->task_name,
                    'weight' => $task->kpiDefinition?->weight,
                    'description' => $task->description,
                    'is_done' => $task->kanbanColumn?->is_done ?? false,
                    'is_verified' => $task->is_verified,
                    'comment_count' => $task->comments->count(),
                    'has_media' => $task->comments->whereNotEmpty('media')->isNotEmpty(),
                ];
            });

        $weeklyScores = KpiWeeklyScore::where('user_id', $user->id)
            ->latest('week_start_date')
            ->take(4)
            ->get();

        $monthlyScore = KpiMonthlyScore::where('user_id', $user->id)
            ->whereMonth('month', now())
            ->first();

        $categoryBreakdown = $todayScore?->category_breakdown ?? [];
        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/dashboard", [
            'todayScore' => $todayScore,
            'todayTasks' => $todayTasks,
            'weeklyScores' => $weeklyScores,
            'monthlyScore' => $monthlyScore,
            'categoryBreakdown' => $categoryBreakdown,
        ]);
    }

    public function daily(?string $date = null): Response
    {
        $user = auth()->user();
        $scoreDate = $date ? Carbon::parse($date) : now();

        $score = KpiDailyScore::where('user_id', $user->id)
            ->where('score_date', $scoreDate->toDateString())
            ->first();

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/daily-detail", [
            'score' => $score,
            'date' => $scoreDate->toDateString(),
        ]);
    }

    public function weekly(?string $weekStart = null): Response
    {
        $user = auth()->user();
        $week = $weekStart ? Carbon::parse($weekStart) : now();
        $weekStartDate = $week->copy()->startOfWeek(Carbon::MONDAY);

        $score = KpiWeeklyScore::where('user_id', $user->id)
            ->where('week_start_date', $weekStartDate->toDateString())
            ->first();

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/weekly-detail", [
            'score' => $score,
            'weekStart' => $weekStartDate->toDateString(),
        ]);
    }

    public function monthly(?string $month = null): Response
    {
        $user = auth()->user();
        $monthDate = $month ? Carbon::parse($month) : now();
        $monthStart = $monthDate->copy()->startOfMonth();

        $score = KpiMonthlyScore::where('user_id', $user->id)
            ->where('month', $monthStart->toDateString())
            ->first();

        $area = $this->getPositionArea();

        return Inertia::render("{$area}/kpi/monthly-detail", [
            'score' => $score,
            'month' => $monthStart->toDateString(),
        ]);
    }

    public function verifyTask(Request $request, Task $task)
    {
        $user = auth()->user();

        if (! $task->assignees()->where('users.id', $user->id)->exists()) {
            abort(403, 'Task tidak ditugaskan kepada Anda');
        }

        $hasEvidence = $this->scoringService->verifyTaskEvidence($task);

        if ($hasEvidence) {
            $task->update([
                'is_verified' => true,
                'verified_at' => now(),
            ]);
        }

        return back()->with('success', 'Task berhasil diverifikasi');
    }
}
