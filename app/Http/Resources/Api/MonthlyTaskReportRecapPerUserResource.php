<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyTaskReportRecapPerUserResource extends JsonResource
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
            'source_task_count' => $this->source_task_count,
            'recap_per_user' => collect($this->recap_per_user)->map(fn (array $user) => [
                'member_key' => $user['member_key'],
                'name' => $user['name'],
                'position' => $user['position'],
                'team_name' => $user['team_name'],
                'work_days' => $user['work_days'],
                'jumlah_task' => $user['jumlah_task'],
                'total_score' => $user['total_score'],
                'skor_maksimal' => $user['skor_maksimal'],
                'target_score' => $user['target_score'],
                'max_score_per_task' => $user['max_score_per_task'],
                'compliance_persen' => $user['compliance_persen'],
                'target_compliance' => $user['target_compliance'],
                'performance_label' => $user['performance_label'],
                'kpi_status' => $user['kpi_status'],
            ])->values(),
        ];
    }
}
