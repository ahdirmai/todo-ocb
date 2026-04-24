<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KanbanColumnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'order' => $this->order,
            'is_default' => $this->is_default,
            'is_done' => $this->is_done,
            'tasks_count' => $this->whenCounted('tasks'),
        ];
    }
}
