<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AgentDailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'string', 'date_format:Y-m-d'],
        ];
    }

    public function reportDate(): string
    {
        return $this->input('date', now()->subDay()->toDateString());
    }
}
