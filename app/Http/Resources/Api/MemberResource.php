<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'position' => $this->position,
            'avatar_url' => $this->avatar_url,
            'role' => $this->whenPivotLoaded('team_user', fn () => $this->pivot->role),
        ];
    }
}
