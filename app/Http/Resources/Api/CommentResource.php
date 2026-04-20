<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\FormatsApiDates;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    use FormatsApiDates;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'content' => $this->content,
            'is_system_log' => $this->is_system_log,
            'created_at' => $this->humanizeDate($this->created_at),
            'updated_at' => $this->humanizeDate($this->updated_at),
            'user' => $this->whenLoaded('user', function () {
                if (! $this->user) {
                    return null;
                }

                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'avatar_url' => $this->user->avatar_url,
                ];
            }),
            'attachments' => MediaResource::collection($this->whenLoaded('media')),
            'replies' => CommentResource::collection($this->whenLoaded('replies')),
        ];
    }
}
