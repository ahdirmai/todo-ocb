<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class TaskSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_type' => 'task',
            'title' => $this->title,
            'description_excerpt' => Str::limit((string) $this->description, 160),
            'due_date' => $this->due_date?->toISOString(),
            'order_position' => $this->order_position,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'comments_count' => $this->whenCounted('comments'),
            'attachments_count' => $this->whenCounted('media'),
            'column' => $this->whenLoaded('kanbanColumn', function () {
                if (! $this->kanbanColumn) {
                    return null;
                }

                return [
                    'id' => $this->kanbanColumn->id,
                    'title' => $this->kanbanColumn->title,
                    'kanban_id' => $this->kanbanColumn->kanban_id,
                ];
            }),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'color' => $tag->color,
            ])->values()),
            'assignees' => MemberResource::collection($this->whenLoaded('assignees')),
            'links' => [
                'api' => route('api.tasks.show', $this->resource),
            ],
        ];
    }
}
