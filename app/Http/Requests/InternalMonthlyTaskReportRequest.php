<?php

namespace App\Http\Requests;

class InternalMonthlyTaskReportRequest extends MonthlyTaskReportRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'month' => $this->input('month', now()->format('Y-m')),
            // team_id intentionally not defaulted — null means "all teams"
        ]);
    }

    public function teamId(): ?string
    {
        $teamId = $this->input('team_id');

        return is_string($teamId) && $teamId !== '' ? $teamId : null;
    }
}
