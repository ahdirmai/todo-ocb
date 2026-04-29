<?php

namespace App\Http\Requests;

use App\Services\MonthlyTaskReportingService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MonthlyTaskReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['superadmin', 'admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'month' => ['nullable', 'date_format:Y-m'],
            'team_id' => [
                'nullable',
                Rule::in(
                    collect(app(MonthlyTaskReportingService::class)->teamOptions())
                        ->pluck('id')
                        ->all()
                ),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $defaultTeamId = collect(app(MonthlyTaskReportingService::class)->teamOptions())
            ->pluck('id')
            ->first();

        $this->merge([
            'month' => $this->input('month', now()->format('Y-m')),
            'team_id' => $this->input('team_id', $defaultTeamId),
        ]);
    }

    public function month(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m', $this->validated('month'))
            ->startOfMonth();
    }

    public function teamId(): ?string
    {
        $teamId = $this->validated('team_id');

        return is_string($teamId) && $teamId !== ''
            ? $teamId
            : null;
    }
}
