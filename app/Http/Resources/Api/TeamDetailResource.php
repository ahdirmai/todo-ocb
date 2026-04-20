<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamDetailResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'grouping' => $this->grouping?->value ?? $this->grouping,
            'is_active' => $this->is_active,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
            'tasks_count' => $this->whenCounted('tasks'),
            'members_count' => $this->whenCounted('users'),
            'documents_count' => $this->whenCounted('documents'),
            'kanbans_count' => $this->whenCounted('kanbans'),
            'announcements_count' => $this->whenCounted('announcements'),
            'messages_count' => $this->whenCounted('messages'),
            'links' => [
                'api' => route('api.teams.show', $this->resource),
                'context' => route('api.teams.context', $this->resource),
                'digest' => route('api.teams.digest', $this->resource),
                'kanbans' => route('api.teams.kanbans.index', $this->resource),
                'tasks' => route('api.teams.tasks.index', $this->resource),
                'members' => route('api.teams.members.index', $this->resource),
                'documents' => route('api.teams.documents.index', $this->resource),
                'announcements' => route('api.teams.announcements.index', $this->resource),
                'messages' => route('api.teams.messages.index', $this->resource),
                'activity_logs' => route('api.teams.activity-logs.index', $this->resource),
                'search' => route('api.teams.search', $this->resource),
                'entity_map' => route('api.teams.entity-map', $this->resource),
                'resolve_references' => route('api.teams.resolve-references', $this->resource),
            ],
        ];
    }
}
