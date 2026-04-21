---
name: app-data-access
description: >
  Guidance for AI agents to read and understand the core data of this application.
  Includes schema overview, model relationships, and common queries for tasks, teams, and members.
  Activate when needing to: list teams, see team members, read tasks, or find documents.
---

This application is a Kanban-based task management system built with Laravel. Most core entities use UUIDs and are scoped to a `Team`.

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

1. **Always use IDs (UUIDs)** for fetching specific records rather than names when possible.
2. **Team Scoping**: Most data (tasks, kanbans, documents) MUST be filtered by `team_id` or accessed via a `Team` relationship to ensure correct context.
3. **Soft Deletes**: Check if models use `SoftDeletes` (though not primary in migrations seen, always verify if `deleted_at` exists).
4. **Media**: Attachments use Spatie Media Library. Check the `media` table filtered by `model_type` (e.g., `App\Models\Task`) and `model_id`.

## Database Schema Inspection

If unsure about columns, always use:
- `php artisan db:show` (overview)
- `database-schema` (table details)
- `grep -r "Schema::create" database/migrations` (migration history)
