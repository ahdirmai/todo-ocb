<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskDetailResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_type' => 'task',
            'team_id' => $this->team_id,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->humanizeDate($this->due_date),
            'order_position' => $this->order_position,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
            'column' => $this->whenLoaded('kanbanColumn', function () {
                if (! $this->kanbanColumn) {
                    return null;
                }

                return [
                    'id' => $this->kanbanColumn->id,
                    'title' => $this->kanbanColumn->title,
                    'kanban_id' => $this->kanbanColumn->kanban_id,
                    'kanban_name' => $this->kanbanColumn->relationLoaded('kanban') ? $this->kanbanColumn->kanban?->name : null,
                ];
            }),
            'creator' => $this->whenLoaded('creator', function () {
                if (! $this->creator) {
                    return null;
                }

                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'email' => $this->creator->email,
                ];
            }),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'color' => $tag->color,
            ])->values()),
            'assignees' => MemberResource::collection($this->whenLoaded('assignees')),
            'attachments' => MediaResource::collection($this->whenLoaded('media')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'links' => [
                'api' => route('api.tasks.show', $this->resource),
            ],
        ];
    }
}
