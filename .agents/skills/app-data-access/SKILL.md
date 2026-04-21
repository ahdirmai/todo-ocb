---
name: app-data-access
description: >
  Guidance for AI agents to read and understand the core data of this application.
  Includes schema overview, model relationships, AI Read API access patterns,
  and common queries for tasks, teams, documents, SOP, and members.
  Activate when needing to: list teams, inspect team context, detect SOP,
  see team members, read tasks, or find documents.
---

This application is a Kanban-based task management system built with Laravel. Most core entities use UUIDs and are scoped to a `Team`.

## Preferred Access Strategy

Prefer the public AI Read API first for agent-friendly reads, then fall back to direct database/model access only when:

- the API does not expose the needed field yet
- the agent needs lower-level relational detail
- debugging requires schema-level validation

### Recommended Read Order

1. `GET /api/teams`
2. `GET /api/teams/{team}/context`
3. Inspect `context.sop`
4. `GET /api/teams/{team}/tasks` or `GET /api/tasks/{task}` as needed
5. `GET /api/teams/{team}/documents` or `GET /api/documents/{document}` as needed
6. `GET /api/teams/{team}/activity-logs` for audit trail

### SOP Fast Detection

Treat `context.sop` as the fastest team-level SOP signal:

- `has_sop`: whether the team has at least one SOP document
- `count`: number of SOP documents in context
- `primary_document`: the first SOP document to use as the default reference
- `documents`: summary list of SOP documents for the team

If `has_sop` is `false`, do not assume the team is non-compliant. It only means no document is currently flagged with `is_sop = true`.

## Core Entities & Relationships

| Entity | Table | Key Fields | Relationships |
|--------|-------|------------|---------------|
| **User** | `users` | `id` (int), `name`, `email`, `position` | Belongs to many **Teams** |
| **Team** | `teams` | `id` (UUID), `name`, `is_active` | Has many **Members**, **Kanbans**, **Tasks**, **Documents** |
| **Task** | `tasks` | `id` (UUID), `team_id`, `kanban_column_id`, `title`, `description`, `due_date` | Belongs to **Team** & **Column**, has many **Assignees** (Users) |
| **Kanban** | `kanbans` | `id` (UUID), `team_id`, `name` | Belongs to **Team**, has many **Columns** |
| **Column** | `kanban_columns` | `id` (UUID), `kanban_id`, `name`, `order_position` | Belongs to **Kanban**, has many **Tasks** |
| **Document** | `documents` | `id` (UUID), `team_id`, `user_id`, `name`, `type`, `is_sop` | Belongs to **Team** & **User**, can have `parent_id` (nested) |
| **Comment** | `comments` | `id` (UUID), `user_id`, `task_id`, `announcement_id`, `document_id`, `content` | Polymorphic-like (belongs to Task, Announcement, or Document) |

## AI Read API Contracts

Use these endpoints when the goal is fast AI consumption rather than raw schema traversal.

### Team Snapshot

- `GET /api/teams`
- `GET /api/teams/{team}`
- `GET /api/teams/{team}/context`
- `GET /api/teams/{team}/digest`

### Team Entities

- `GET /api/teams/{team}/members`
- `GET /api/teams/{team}/kanbans`
- `GET /api/teams/{team}/tasks`
- `GET /api/tasks/{task}`
- `GET /api/teams/{team}/documents`
- `GET /api/documents/{document}`
- `GET /api/teams/{team}/announcements`
- `GET /api/announcements/{announcement}`
- `GET /api/teams/{team}/messages`
- `GET /api/teams/{team}/activity-logs`

### Lookup Utilities

- `GET /api/teams/{team}/search`
- `GET /api/teams/{team}/entity-map`
- `POST /api/teams/{team}/resolve-references`

## Common Data Access Queries

Use `database-query` or `php artisan tinker --execute '...'` to fetch data.

### Teams & Members
- **List all teams**: `Team::select('id', 'name')->get();`
- **List team members**: 
  ```php
  $team = Team::find($team_id);
  $members = $team->users()->select('users.id', 'name', 'email', 'position', 'role')->get();
  ```
- **Check user role in team** (via `team_user` pivot): `DB::table('team_user')->where('user_id', $user_id)->get();`

### Kanban & Tasks
- **List Kanbans for a team**: `Kanban::where('team_id', $team_id)->get();`
- **List all tasks in a team**: `Task::where('team_id', $team_id)->orderBy('order_position')->get();`
- **List tasks in a specific column**: `Task::where('kanban_column_id', $column_id)->orderBy('order_position')->get();`
- **Get task with assignees**: `Task::with('users')->find($task_id);`

### Documents & Folders
- **List root documents/folders**: `Document::where('team_id', $team_id)->whereNull('parent_id')->get();`
- **List contents of a folder**: `Document::where('parent_id', $folder_id)->get();`
- **Search documents by name**: `Document::where('team_id', $team_id)->where('name', 'like', '%keyword%')->get();`
- **Find SOP documents**: `Document::where('team_id', $team_id)->where('is_sop', true)->get();`
- **Find primary SOP candidate**: `Document::where('team_id', $team_id)->where('is_sop', true)->latest()->first();`

### Comments (Polymorphic-like filtering)
- **Comments for a specific Document**: `Comment::where('document_id', $document_id)->get();`
- **Comments for an Announcement**: `Comment::where('announcement_id', $announcement_id)->get();`
- **Threaded comments**: `Comment::where('parent_id', $comment_id)->get();`

### Media & Attachments (Spatie Media Library)
- **Get all media for a Task**: 
  ```php
  $task = Task::find($task_id);
  $media = $task->getMedia(); // or $task->getMedia('attachments')
  ```
- **Direct query on media table**: `DB::table('media')->where('model_type', 'App\Models\Task')->where('model_id', $task_id)->get();`

### Tags & Labels
- **Get all tasks with a specific Tag**: `Task::withAnyTags(['urgent'], 'App\Models\Task')->get();` (assuming Spatie Tags)
- **Get task labels**: `Task::find($task_id)->labels;` (if many-to-many)

### Activity & Messages
- **Recent team messages**: `TeamMessage::where('team_id', $team_id)->with('user')->latest()->limit(50)->get();`
- **System-wide activity for a team**: `ActivityLog::where('team_id', $team_id)->latest()->paginate(20);`

## Data Access Guidelines

1. **Context first**: When possible, start from `/api/teams/{team}/context` before drilling into tasks or documents.
2. **Always use IDs (UUIDs)** for fetching specific records rather than names when possible.
3. **Team scoping**: Most data (tasks, kanbans, documents) MUST be filtered by `team_id` or accessed via a `Team` relationship to ensure correct context.
4. **SOP-aware reads**: Use `context.sop.primary_document` first, then fall back to document search if needed.
5. **Soft deletes**: Check if models use `SoftDeletes` (though not primary in migrations seen, always verify if `deleted_at` exists).
6. **Media**: Attachments use Spatie Media Library. Check the `media` table filtered by `model_type` (e.g., `App\Models\Task`) and `model_id`.

## Database Schema Inspection

If unsure about columns, always use:
- `php artisan db:show` (overview)
- `database-schema` (table details)
- `grep -r "Schema::create" database/migrations` (migration history)
