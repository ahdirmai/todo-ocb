<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyReporterResource extends JsonResource
{
    /**
     * Daily report payload without KPI task details — just the submitted report
     * fields and reporter metadata.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->user;
        $position = $user?->jobPosition;

        return [
            'id' => $this->id,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'job_position' => $position
                    ? ['name' => $position->name, 'area_slug' => $position->area_slug]
                    : null,
            ] : null,
            'store' => $this->store ? [
                'id' => $this->store->id,
                'name' => $this->store->name,
                'branch_code' => $this->store->branch_code,
            ] : null,
            'fields' => $this->fields ?? [],
            'report_fields' => $this->report_fields ?? [],
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'is_late' => $this->is_late,
        ];
    }
}
