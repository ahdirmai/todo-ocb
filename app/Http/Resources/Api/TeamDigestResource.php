<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamDigestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'team' => TeamDetailResource::make($this->resource['team']),
            'overdue_tasks' => TaskSummaryResource::collection($this->resource['overdue_tasks']),
            'tasks_due_today' => TaskSummaryResource::collection($this->resource['tasks_due_today']),
            'recent_announcements' => AnnouncementSummaryResource::collection($this->resource['recent_announcements']),
            'recent_messages' => TeamMessageResource::collection($this->resource['recent_messages']),
            'latest_documents' => DocumentSummaryResource::collection($this->resource['latest_documents']),
        ];
    }
}
