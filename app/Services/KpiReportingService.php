<?php

namespace App\Services;

use App\Models\KpiDailyReport;
use App\Models\KpiDailyScore;
use App\Models\Position;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Arr;

class KpiReportingService
{
    public function createDailyReport(User $user, array $data): KpiDailyReport
    {
        $team = $user->teams()->where('is_spv_team', true)->first();

        $reportDate = $data['report_date'] ?? now()->toDateString();
        $submittedAt = $data['submitted_at'] ?? now();
        $isLate = $this->checkReportDeadline($submittedAt);

        // Extract fields from data — everything except meta fields
        $metaKeys = ['report_date', 'submitted_at', 'is_late', 'attachments', 'report_data'];
        $fields = Arr::except($data, $metaKeys);

        return KpiDailyReport::updateOrCreate(
            [
                'user_id' => $user->id,
                'report_date' => $reportDate,
            ],
            [
                'team_id' => $team?->id,
                'fields' => $fields,
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

    /**
     * Get report field template for a given position.
     *
     * Accepts null (e.g. admin with no job position) — returns an empty template.
     *
     * @return array<int, array{field_key: string, field_label: string, field_type: string, field_options: ?array, group_label: ?string, is_required: bool, sort_order: int}>
     */
    public function getReportFieldsTemplate(?string $positionName): array
    {
        if ($positionName === null || $positionName === '') {
            return [];
        }

        $position = Position::where('name', $positionName)->first();
        if (! $position) {
            return [];
        }

        return PositionReportField::where('position_id', $position->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (PositionReportField $f) => [
                'field_key' => $f->field_key,
                'field_label' => $f->field_label,
                'field_type' => $f->field_type,
                'field_options' => $f->field_options,
                'group_label' => $f->group_label,
                'is_required' => $f->is_required,
                'sort_order' => $f->sort_order,
            ])
            ->values()
            ->toArray();
    }

    /**
     * Build Laravel validation rules from template fields.
     *
     * @return array<string, string>
     */
    public function buildValidationRules(array $templateFields): array
    {
        $rules = [];

        foreach ($templateFields as $field) {
            $rule = [];

            if ($field['is_required']) {
                $rule[] = 'required';
            } else {
                $rule[] = 'nullable';
            }

            match ($field['field_type']) {
                'textarea' => $rule[] = 'string',
                'text' => $rule[] = 'string',
                'number' => $rule[] = 'numeric',
                default => $rule[] = 'string',
            };

            if (! empty($field['field_options']['max_length'])) {
                $rule[] = 'max:'.$field['field_options']['max_length'];
            }

            $rules['fields.'.$field['field_key']] = implode('|', $rule);
        }

        // Always accept attachments
        $rules['attachments'] = 'nullable|array|max:5';
        $rules['attachments.*'] = 'file|mimes:jpg,jpeg,png,pdf|max:5120';

        return $rules;
    }

    /**
     * Whether the user has any KPI task scheduled for the given date.
     */
    public function hasKpiTasksForDate(User $user, string $date): bool
    {
        $team = $user->teams()->where('is_spv_team', true)->first();

        $query = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $date);

        if ($team) {
            $query->where('team_id', $team->id);
        }

        return $query->exists();
    }

    /**
     * Weighted completion (%) of a user's KPI tasks for a date — verified task
     * weight over total task weight. Used to gate daily report submission.
     */
    public function getWeightedTaskProgress(User $user, string $date): float
    {
        $team = $user->teams()->where('is_spv_team', true)->first();

        $query = Task::where('is_kpi_task', true)
            ->where('creator_id', $user->id)
            ->whereDate('created_at', $date)
            ->with('kpiDefinition:id,weight');

        if ($team) {
            $query->where('team_id', $team->id);
        }

        $tasks = $query->get();

        $totalWeight = $tasks->sum(fn (Task $task) => (float) ($task->kpiDefinition?->weight ?? 0));
        if ($totalWeight <= 0) {
            return 0.0;
        }

        $verifiedWeight = $tasks
            ->filter(fn (Task $task) => $task->is_verified)
            ->sum(fn (Task $task) => (float) ($task->kpiDefinition?->weight ?? 0));

        return round(($verifiedWeight / $totalWeight) * 100, 2);
    }

    public function checkReportDeadline(CarbonInterface $submittedAt): bool
    {
        $deadline = $submittedAt->copy()->setTime(22, 30, 0);

        return $submittedAt->isAfter($deadline);
    }
}
