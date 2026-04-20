<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'grouping' => $this->grouping?->value ?? $this->grouping,
            'is_active' => $this->is_active,
            'tasks_count' => $this->whenCounted('tasks'),
            'members_count' => $this->whenCounted('users'),
            'documents_count' => $this->whenCounted('documents'),
            'links' => [
                'api' => route('api.teams.show', $this->resource),
                'context' => route('api.teams.context', $this->resource),
            ],
        ];
    }
}
