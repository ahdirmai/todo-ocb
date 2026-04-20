<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentSummaryResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_type' => 'document',
            'team_id' => $this->team_id,
            'parent_id' => $this->parent_id,
            'type' => $this->type,
            'name' => $this->name,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
            'children_count' => $this->whenCounted('children'),
            'comments_count' => $this->whenCounted('comments'),
            'owner' => $this->whenLoaded('user', function () {
                if (! $this->user) {
                    return null;
                }

                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            'links' => [
                'api' => route('api.documents.show', $this->resource),
            ],
        ];
    }
}
