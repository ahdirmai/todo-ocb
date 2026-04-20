<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamContextResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'team' => TeamDetailResource::make($this->resource),
            'members' => MemberResource::collection($this->whenLoaded('users')),
            'kanbans' => KanbanResource::collection($this->whenLoaded('kanbans')),
            'recent_tasks' => TaskSummaryResource::collection($this->whenLoaded('recentTasks')),
            'recent_documents' => DocumentSummaryResource::collection($this->whenLoaded('recentDocuments')),
            'recent_announcements' => AnnouncementSummaryResource::collection($this->whenLoaded('recentAnnouncements')),
            'recent_messages' => TeamMessageResource::collection($this->whenLoaded('recentMessages')),
            'recent_activity' => ActivityLogResource::collection($this->whenLoaded('recentActivity')),
        ];
    }
}
