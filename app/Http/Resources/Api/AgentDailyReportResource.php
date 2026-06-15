<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgentDailyReportResource extends JsonResource
{
    /**
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
                'job_position' => $position ? ['name' => $position->name] : null,
            ] : null,
            'fields' => $this->fields ?? [],
            'report_fields' => $this->report_fields ?? [],
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'is_late' => $this->is_late,
        ];
    }
}
