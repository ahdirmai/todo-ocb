<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementDetailResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_type' => 'announcement',
            'team_id' => $this->team_id,
            'title' => $this->title,
            'content' => $this->content,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
            'author' => $this->whenLoaded('user', function () {
                if (! $this->user) {
                    return null;
                }

                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            'attachments' => MediaResource::collection($this->whenLoaded('media')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'links' => [
                'api' => route('api.announcements.show', $this->resource),
            ],
        ];
    }
}
