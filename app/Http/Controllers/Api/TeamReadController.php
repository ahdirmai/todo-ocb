<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TeamActivityIndexRequest;
use App\Http\Requests\Api\TeamDocumentIndexRequest;
use App\Http\Requests\Api\TeamResolveReferencesRequest;
use App\Http\Requests\Api\TeamSearchRequest;
use App\Http\Resources\Api\ActivityLogResource;
use App\Http\Resources\Api\AnnouncementDetailResource;
use App\Http\Resources\Api\AnnouncementSummaryResource;
use App\Http\Resources\Api\DocumentDetailResource;
use App\Http\Resources\Api\DocumentSummaryResource;
use App\Http\Resources\Api\EntityReferenceResource;
use App\Http\Resources\Api\KanbanResource;
use App\Http\Resources\Api\MemberResource;
use App\Http\Resources\Api\TeamContextResource;
use App\Http\Resources\Api\TeamDetailResource;
use App\Http\Resources\Api\TeamDigestResource;
use App\Http\Resources\Api\TeamMessageResource;
use App\Http\Resources\Api\TeamSummaryResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Document;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMessage;
use Illuminate\Http\Request;

class TeamReadController extends Controller
{
    public function index(Request $request)
    {
        $teams = Team::query()
            ->withCount(['tasks', 'users', 'documents'])
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->trim().'%')
            )
            ->when(
                $request->filled('is_active'),
                fn ($query) => $query->where('is_active', $request->boolean('is_active'))
            )
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return TeamSummaryResource::collection($teams);
    }

    public function show(Team $team)
    {
        $team->loadCount(['tasks', 'users', 'documents', 'kanbans', 'announcements', 'messages']);

        return TeamDetailResource::make($team);
    }

    public function context(Team $team)
    {
        $team->loadCount(['tasks', 'users', 'documents', 'kanbans', 'announcements', 'messages']);
        $team->load([
            'users' => fn ($query) => $query
                ->select('users.id', 'users.name', 'users.email', 'users.position')
                ->withPivot('role')
                ->orderBy('users.name'),
            'kanbans.columns' => fn ($query) => $query->withCount('tasks')->orderBy('order'),
        ]);

        $team->setRelation('recentTasks', Task::query()
            ->whereBelongsTo($team)
            ->with(['kanbanColumn', 'assignees', 'tags'])
            ->withCount(['comments', 'media'])
            ->latest('updated_at')
            ->limit(10)
            ->get());

        $team->setRelation('recentDocuments', $team->documents()
            ->with('user')
            ->withCount(['children', 'comments'])
            ->latest()
            ->limit(10)
            ->get());

        $team->setRelation('recentAnnouncements', Announcement::query()
            ->whereBelongsTo($team)
            ->with('user')
            ->withCount('comments')
            ->latest()
            ->limit(5)
            ->get());

        $team->setRelation('recentMessages', TeamMessage::query()
            ->whereBelongsTo($team)
            ->with(['user', 'media'])
            ->latest()
            ->limit(10)
            ->get()
            ->reverse()
            ->values());

        $team->setRelation('recentActivity', ActivityLog::query()
            ->forTeam($team->id)
            ->with(['causer', 'subject'])
            ->latest()
            ->limit(20)
            ->get());

        return TeamContextResource::make($team);
    }

    public function digest(Team $team)
    {
        $team->loadCount(['tasks', 'users', 'documents', 'kanbans', 'announcements', 'messages']);

        return TeamDigestResource::make([
            'team' => $team,
            'overdue_tasks' => Task::query()
                ->whereBelongsTo($team)
                ->whereNotNull('due_date')
                ->where('due_date', '<', now())
                ->with(['kanbanColumn', 'assignees', 'tags'])
                ->withCount(['comments', 'media'])
                ->orderBy('due_date')
                ->limit(10)
                ->get(),
            'tasks_due_today' => Task::query()
                ->whereBelongsTo($team)
                ->whereDate('due_date', today())
                ->with(['kanbanColumn', 'assignees', 'tags'])
                ->withCount(['comments', 'media'])
                ->orderBy('due_date')
                ->limit(10)
                ->get(),
            'recent_announcements' => Announcement::query()
                ->whereBelongsTo($team)
                ->with('user')
                ->withCount('comments')
                ->latest()
                ->limit(5)
                ->get(),
            'recent_messages' => TeamMessage::query()
                ->whereBelongsTo($team)
                ->with(['user', 'media'])
                ->latest()
                ->limit(10)
                ->get()
                ->reverse()
                ->values(),
            'latest_documents' => $team->documents()
                ->with('user')
                ->withCount(['children', 'comments'])
                ->latest()
                ->limit(10)
                ->get(),
        ]);
    }

    public function members(Request $request, Team $team)
    {
        $members = $team->users()
            ->select('users.id', 'users.name', 'users.email', 'users.position')
            ->withPivot('role')
            ->orderBy('users.name')
            ->paginate($request->integer('per_page', 50));

        return MemberResource::collection($members);
    }

    public function kanbans(Request $request, Team $team)
    {
        $kanbans = $team->kanbans()
            ->with(['columns' => fn ($query) => $query->withCount('tasks')->orderBy('order')])
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return KanbanResource::collection($kanbans);
    }

    public function documents(TeamDocumentIndexRequest $request, Team $team)
    {
        $documents = $team->documents()
            ->with('user')
            ->withCount(['children', 'comments'])
            ->when(
                $request->filled('parent_id'),
                fn ($query) => $query->where('parent_id', $request->string('parent_id')->toString())
            )
            ->when(
                ! $request->filled('parent_id'),
                fn ($query) => $query->whereNull('parent_id')
            )
            ->when(
                $request->filled('type'),
                fn ($query) => $query->where('type', $request->string('type')->toString())
            )
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->trim().'%')
            )
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return DocumentSummaryResource::collection($documents);
    }

    public function document(Document $document)
    {
        $document->load([
            'user',
            'parent',
            'children.user',
            'media',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->with(['user', 'media', 'replies.user', 'replies.media'])
                ->latest(),
        ]);
        $document->loadCount(['children', 'comments']);

        return DocumentDetailResource::make($document);
    }

    public function announcements(Request $request, Team $team)
    {
        $announcements = Announcement::query()
            ->whereBelongsTo($team)
            ->with('user')
            ->withCount('comments')
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where(function ($searchQuery) use ($request) {
                    $term = $request->string('search')->trim()->toString();

                    $searchQuery
                        ->where('title', 'like', '%'.$term.'%')
                        ->orWhere('content', 'like', '%'.$term.'%');
                })
            )
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return AnnouncementSummaryResource::collection($announcements);
    }

    public function announcement(Announcement $announcement)
    {
        $announcement->load([
            'user',
            'media',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->with(['user', 'media', 'replies.user', 'replies.media'])
                ->latest(),
        ]);
        $announcement->loadCount('comments');

        return AnnouncementDetailResource::make($announcement);
    }

    public function messages(Request $request, Team $team)
    {
        $messages = TeamMessage::query()
            ->whereBelongsTo($team)
            ->with(['user', 'media'])
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where('body', 'like', '%'.$request->string('search')->trim().'%')
            )
            ->latest()
            ->paginate($request->integer('per_page', 50));

        return TeamMessageResource::collection($messages);
    }

    public function activityLogs(TeamActivityIndexRequest $request, Team $team)
    {
        $logs = ActivityLog::query()
            ->forTeam($team->id)
            ->with(['causer', 'subject'])
            ->when(
                $request->filled('log_name'),
                fn ($query) => $query->where('log_name', $request->string('log_name')->toString())
            )
            ->when(
                $request->filled('event'),
                fn ($query) => $query->where('event', $request->string('event')->toString())
            )
            ->when(
                $request->filled('subject_type'),
                fn ($query) => $query->where('subject_type', $request->string('subject_type')->toString())
            )
            ->when(
                $request->filled('subject_id'),
                fn ($query) => $query->where('subject_id', $request->string('subject_id')->toString())
            )
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return ActivityLogResource::collection($logs);
    }

    public function search(TeamSearchRequest $request, Team $team): array
    {
        $query = $request->string('q')->trim()->toString();
        $limit = $request->integer('limit', 5);

        $tasks = Task::query()
            ->whereBelongsTo($team)
            ->where('title', 'like', '%'.$query.'%')
            ->latest('updated_at')
            ->limit($limit)
            ->get()
            ->map(fn (Task $task) => [
                'type' => 'task',
                'id' => $task->id,
                'label' => $task->title,
                'description' => $task->description,
                'meta' => ['due_date' => $task->due_date?->diffForHumans()],
                'links' => ['api' => route('api.tasks.show', $task)],
            ]);

        $documents = $team->documents()
            ->where('name', 'like', '%'.$query.'%')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Document $document) => [
                'type' => 'document',
                'id' => $document->id,
                'label' => $document->name,
                'description' => $document->type,
                'meta' => ['document_type' => $document->type],
                'links' => ['api' => route('api.documents.show', $document)],
            ]);

        $members = $team->users()
            ->select('users.id', 'users.name', 'users.email', 'users.position')
            ->where(function ($memberQuery) use ($query) {
                $memberQuery
                    ->where('users.name', 'like', '%'.$query.'%')
                    ->orWhere('users.email', 'like', '%'.$query.'%');
            })
            ->orderBy('users.name')
            ->limit($limit)
            ->get()
            ->map(fn ($member) => [
                'type' => 'member',
                'id' => $member->id,
                'label' => $member->name,
                'description' => $member->email,
                'meta' => ['position' => $member->position],
                'links' => [],
            ]);

        $announcements = Announcement::query()
            ->whereBelongsTo($team)
            ->where(function ($announcementQuery) use ($query) {
                $announcementQuery
                    ->where('title', 'like', '%'.$query.'%')
                    ->orWhere('content', 'like', '%'.$query.'%');
            })
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Announcement $announcement) => [
                'type' => 'announcement',
                'id' => $announcement->id,
                'label' => $announcement->title ?: 'Untitled announcement',
                'description' => $announcement->content,
                'meta' => [],
                'links' => [],
            ]);

        return [
            'query' => $query,
            'team_id' => $team->id,
            'results' => [
                'tasks' => EntityReferenceResource::collection($tasks)->collection->values()->all(),
                'documents' => EntityReferenceResource::collection($documents)->collection->values()->all(),
                'members' => EntityReferenceResource::collection($members)->collection->values()->all(),
                'announcements' => EntityReferenceResource::collection($announcements)->collection->values()->all(),
            ],
        ];
    }

    public function entityMap(Team $team): array
    {
        return [
            'team_id' => $team->id,
            'tasks' => Task::query()
                ->whereBelongsTo($team)
                ->orderBy('title')
                ->limit(200)
                ->get()
                ->map(fn (Task $task) => [
                    'id' => $task->id,
                    'label' => $task->title,
                ])
                ->values()
                ->all(),
            'members' => $team->users()
                ->select('users.id', 'users.name')
                ->orderBy('users.name')
                ->get()
                ->map(fn ($member) => [
                    'id' => $member->id,
                    'label' => $member->name,
                ])
                ->values()
                ->all(),
            'documents' => $team->documents()
                ->select('id', 'name')
                ->orderBy('name')
                ->limit(200)
                ->get()
                ->map(fn (Document $document) => [
                    'id' => $document->id,
                    'label' => $document->name,
                ])
                ->values()
                ->all(),
            'columns' => $team->kanbans()
                ->with('columns:id,kanban_id,title')
                ->get()
                ->flatMap(fn ($kanban) => $kanban->columns->map(fn ($column) => [
                    'id' => $column->id,
                    'label' => $column->title,
                ]))
                ->values()
                ->all(),
        ];
    }

    public function resolveReferences(TeamResolveReferencesRequest $request, Team $team): array
    {
        $text = mb_strtolower($request->string('text')->trim()->toString());
        $limit = $request->integer('limit', 5);

        $taskMatches = Task::query()
            ->whereBelongsTo($team)
            ->whereRaw('LOWER(title) like ?', ['%'.$text.'%'])
            ->limit($limit)
            ->get()
            ->map(fn (Task $task) => [
                'type' => 'task',
                'id' => $task->id,
                'label' => $task->title,
                'description' => $task->description,
                'meta' => ['confidence' => 0.9],
                'links' => ['api' => route('api.tasks.show', $task)],
            ]);

        $documentMatches = $team->documents()
            ->whereRaw('LOWER(name) like ?', ['%'.$text.'%'])
            ->limit($limit)
            ->get()
            ->map(fn (Document $document) => [
                'type' => 'document',
                'id' => $document->id,
                'label' => $document->name,
                'description' => $document->type,
                'meta' => ['confidence' => 0.88],
                'links' => ['api' => route('api.documents.show', $document)],
            ]);

        $memberMatches = $team->users()
            ->select('users.id', 'users.name', 'users.email', 'users.position')
            ->where(function ($query) use ($text) {
                $query
                    ->whereRaw('LOWER(users.name) like ?', ['%'.$text.'%'])
                    ->orWhereRaw('LOWER(users.email) like ?', ['%'.$text.'%']);
            })
            ->limit($limit)
            ->get()
            ->map(fn ($member) => [
                'type' => 'member',
                'id' => $member->id,
                'label' => $member->name,
                'description' => $member->email,
                'meta' => [
                    'position' => $member->position,
                    'confidence' => 0.85,
                ],
                'links' => [],
            ]);

        $columnMatches = $team->kanbans()
            ->with(['columns' => fn ($query) => $query->whereRaw('LOWER(title) like ?', ['%'.$text.'%'])])
            ->get()
            ->flatMap(fn ($kanban) => $kanban->columns->map(fn ($column) => [
                'type' => 'column',
                'id' => $column->id,
                'label' => $column->title,
                'description' => $kanban->name,
                'meta' => ['confidence' => 0.82],
                'links' => [],
            ]))
            ->take($limit);

        return [
            'text' => $request->string('text')->toString(),
            'team_id' => $team->id,
            'matches' => EntityReferenceResource::collection(
                collect()
                    ->concat($taskMatches)
                    ->concat($documentMatches)
                    ->concat($memberMatches)
                    ->concat($columnMatches)
                    ->take($limit)
                    ->values()
            )->collection->all(),
        ];
    }
}
