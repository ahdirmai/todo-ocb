<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityReferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => $this['type'],
            'id' => $this['id'],
            'label' => $this['label'],
            'description' => $this['description'] ?? null,
            'meta' => $this['meta'] ?? [],
            'links' => $this['links'] ?? [],
        ];
    }
}
