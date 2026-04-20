<?php

namespace App\Http\Resources\Api;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'properties' => $this->properties,
            'created_at' => $this->created_at?->toISOString(),
            'subject' => $this->formatRelatedModel($this->whenLoaded('subject')),
            'causer' => $this->formatRelatedModel($this->whenLoaded('causer')),
        ];
    }

    private function formatRelatedModel(mixed $model): ?array
    {
        if (! $model instanceof Model) {
            return null;
        }

        return [
            'type' => class_basename($model),
            'id' => $model->getKey(),
            'label' => $model->name ?? $model->title ?? $model->id,
        ];
    }
}
