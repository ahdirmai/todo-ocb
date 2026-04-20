<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class TaskSummaryResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_type' => 'task',
            'title' => $this->title,
            'description_excerpt' => Str::limit((string) $this->description, 160),
            'due_date' => $this->humanizeDate($this->due_date),
            'order_position' => $this->order_position,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
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
