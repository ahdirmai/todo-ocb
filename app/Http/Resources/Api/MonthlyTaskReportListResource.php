<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyTaskReportListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'month' => $this->report_month?->format('Y-m'),
            'report_month' => $this->report_month?->toDateString(),
            'platform' => $this->platform,
            'team' => $this->whenLoaded('team', function () {
                if (! $this->team) {
                    return null;
                }

                return [
                    'id' => $this->team->id,
                    'name' => $this->team->name,
                    'slug' => $this->team->slug,
                ];
            }),
            'generated_at' => $this->generated_at?->toDateTimeString(),
            'generated_by' => $this->whenLoaded('generator', function () {
                if (! $this->generator) {
                    return null;
                }

                return [
                    'id' => $this->generator->id,
                    'name' => $this->generator->name,
                    'email' => $this->generator->email,
                ];
            }),
            'source_task_count' => $this->source_task_count,
            'model' => $this->model,
            'prompt_version' => $this->prompt_version,
        ];
    }
}
