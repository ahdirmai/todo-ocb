<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamContextResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sopDocuments = $this->whenLoaded('sopDocuments');

        return [
            'team' => TeamDetailResource::make($this->resource),
            'sop' => [
                'has_sop' => $this->relationLoaded('sopDocuments') ? $this->sopDocuments->isNotEmpty() : false,
                'count' => $this->relationLoaded('sopDocuments') ? $this->sopDocuments->count() : 0,
                'primary_document' => $this->relationLoaded('sopDocuments') && $this->sopDocuments->isNotEmpty()
                    ? DocumentSummaryResource::make($this->sopDocuments->first())
                    : null,
                'documents' => DocumentSummaryResource::collection($sopDocuments),
            ],
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
