<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentDetailResource extends JsonResource
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
            'is_sop' => $this->is_sop,
            'name' => $this->name,
            'content' => $this->content,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
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
            'parent' => $this->whenLoaded('parent', function () {
                if (! $this->parent) {
                    return null;
                }

                return [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                    'type' => $this->parent->type,
                ];
            }),
            'children' => DocumentSummaryResource::collection($this->whenLoaded('children')),
            'attachments' => MediaResource::collection($this->whenLoaded('media')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'links' => [
                'api' => route('api.documents.show', $this->resource),
            ],
        ];
    }
}
