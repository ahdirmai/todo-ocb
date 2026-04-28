---
name: app-data-access
description: >
  Guidance for AI agents to read and understand the core data of this application.
  Includes schema overview, model relationships, AI Read API access patterns,
  and common queries for tasks, teams, documents, SOP, and members.
  Activate when needing to: list teams, inspect team context, detect SOP,
  see team members, read tasks, or find documents.
---

# app-data-access - Kanban Task Management System Guide

**Last Updated:** Sat 2026-04-25  
**Status:** ✅ Production Ready  
**API Host:** localhost:8888 (no auth required)

---

## Overview

This application is a **Kanban-based task management system** built with Laravel. Most core entities use UUIDs and are scoped to a Team.

Key capabilities:
- ✅ Task management (create, assign, status tracking)
- ✅ Team collaboration (members, roles, activity logs)
- ✅ Document management (SOP, attachments, versioning)
- ✅ Kanban boards (columns, task flow automation)
- ✅ Audit trail (activity logs, comment history)
- ✅ Search & filtering (by team, status, assignee, date)

---

## Preferred Access Strategy

**Priority Order (Recommended):**

1. **Prefer the public AI Read API first** — agent-friendly, pre-formatted, cached
2. **Fall back to direct database access only when:**
   - API doesn't expose needed field yet
   - Agent needs lower-level relational detail
   - Debugging requires schema-level validation

**Why API-first?**
- Fast responses (pre-aggregated data)
- Consistent formatting (no SQL parsing needed)
- No database load (read cache)
- Built-in pagination & filtering

---

## Recommended Read Order

When analyzing a team or task, follow this sequence:

```
1. GET /api/teams
   ↓ (list all teams)
   
2. GET /api/teams/{team_id}/context
   ↓ (team metadata + SOP signal + task count)
   
3. Inspect context.sop
   ↓ (does team have SOP? how many docs?)
   
4. GET /api/teams/{team_id}/tasks
   ↓ (all tasks in team + status breakdown)
   
5. GET /api/tasks/{task_id} (if detail needed)
   ↓ (full task + assignees + comments)
   
6. GET /api/teams/{team_id}/documents
   ↓ (all documents: SOP, guides, attachments)
   
7. GET /api/teams/{team_id}/activity-logs
   ↓ (audit trail: who changed what when)
```

---

## SOP Fast Detection

The `context.sop` object is the **fastest team-level SOP signal**:

```json
{
  "has_sop": true,
  "count": 3,
  "primary_document": {
    "id": "uuid...",
    "name": "SOP - Task Management",
    "type": "sop",
    "is_sop": true
  },
  "documents": [
    { "id": "...", "name": "SOP - Task Management", "type": "sop" },
    { "id": "...", "name": "SOP - Absensi", "type": "sop" },
    { "id": "...", "name": "Guidelines", "type": "guide" }
  ]
}
```

**Key Rules:**
- `has_sop: true` = team has at least one SOP document (reliable signal)
- `has_sop: false` = no document flagged `is_sop=true` (NOT non-compliance; just no SOP document marked yet)
- `primary_document` = first SOP to use as default reference
- Use `documents` list to find specific SOP by name/type

**When SOP Not Found:**
- Don't assume team is non-compliant
- Check if documents exist but not flagged `is_sop=true`
- Consider creating/flagging a SOP document

---

## Core Entities & Relationships

### Complete Schema Map

| Entity | Table | Key Fields | Relationships |
|--------|-------|------------|---------------|
| **User** | users | id (int), name, email, position, avatar_url | Belongs to many Teams (via team_user pivot) |
| **Team** | teams | id (UUID), name, is_active, created_at, updated_at | Has many: Members, Kanbans, Tasks, Documents, Comments, ActivityLogs |
| **Team User** (Pivot) | team_user | team_id, user_id, role (admin/member) | Links User ↔ Team with role |
| **Task** | tasks | id (UUID), team_id, kanban_column_id, title, description, due_date, status, priority, created_at | Belongs to: Team, Column; Has many: Assignees (via task_user), Comments, ActivityLogs |
| **Task User** (Pivot) | task_user | task_id, user_id | Links Task ↔ Assignee |
| **Kanban** | kanbans | id (UUID), team_id, name | Belongs to Team, has many Columns |
| **Column** | kanban_columns | id (UUID), kanban_id, name, order_position, wip_limit, is_done | Belongs to Kanban, has many Tasks |
| **Document** | documents | id (UUID), team_id, user_id, name, type (sop/guide/attachment), is_sop, parent_id, mime_type | Belongs to: Team, User; Can be nested (parent_id) |
| **Comment** | comments | id (UUID), user_id, task_id OR document_id OR announcement_id, content, created_at | Polymorphic: belongs to Task/Document/Announcement |
| **Announcement** | announcements | id (UUID), team_id, user_id, title, content, is_pinned, created_at | Belongs to: Team, User; Has many Comments |
| **Activity Log** | activity_logs | id (UUID), team_id, user_id, action, subject_type, subject_id, description, created_at | Belongs to: Team, User; Tracks changes |

---

## AI Read API Contracts

All endpoints are **GET** (read-only), return **JSON**, no authentication required.

### Team Snapshot

```http
GET /api/teams
```
List all teams with basic info.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "SPV UNIT 1",
      "is_active": true,
      "member_count": 8,
      "task_count": 16,
      "created_at": "2026-04-10T10:00:00Z"
    }
  ],
  "meta": { "total": 6, "per_page": 50 }
}
```

---

```http
GET /api/teams/{team_id}
```
Get single team details.

**Response:**
```json
{
  "id": "uuid",
  "name": "SPV UNIT 1",
  "is_active": true,
  "member_count": 8,
  "task_count": 16,
  "document_count": 3,
  "created_at": "2026-04-10T10:00:00Z"
}
```

---

```http
GET /api/teams/{team_id}/context
```
**⭐ FASTEST WAY TO GET TEAM SNAPSHOT**

Returns team metadata + SOP signal + task breakdown + member list.

**Response:**
```json
{
  "team": {
    "id": "uuid",
    "name": "SPV UNIT 1",
    "is_active": true
  },
  "members": [
    { "id": 1, "name": "Aditya Rahman", "role": "member", "position": "Supervisor" },
    { "id": 2, "name": "Oscar Ibrahim", "role": "admin", "position": "Manager" }
  ],
  "sop": {
    "has_sop": true,
    "count": 2,
    "primary_document": { "id": "uuid", "name": "SOP - Task Management", "type": "sop" },
    "documents": [ ... ]
  },
  "task_summary": {
    "total": 16,
    "by_status": { "todo": 16, "in_progress": 0, "in_review": 0, "done": 0 },
    "by_priority": { "low": 2, "normal": 14, "high": 0, "urgent": 0 },
    "overdue": 6
  },
  "kanbans": [
    { "id": "uuid", "name": "Default Kanban", "column_count": 4 }
  ]
}
```

---

### Team Entities

```http
GET /api/teams/{team_id}/members
```
List all team members with roles.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Aditya Rahman",
      "email": "aditya@ocb.com",
      "position": "Supervisor",
      "role": "member",
      "avatar_url": "..."
    }
  ]
}
```

---

```http
GET /api/teams/{team_id}/kanbans
```
List all Kanban boards in team.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Default Kanban",
      "column_count": 4,
      "columns": [
        { "id": "uuid", "name": "TODO", "order": 1, "task_count": 16 },
        { "id": "uuid", "name": "IN PROGRESS", "order": 2, "task_count": 0 },
        { "id": "uuid", "name": "IN REVIEW", "order": 3, "task_count": 0 },
        { "id": "uuid", "name": "DONE", "order": 4, "task_count": 0 }
      ]
    }
  ]
}
```

---

```http
GET /api/teams/{team_id}/tasks
```
List all tasks in team with optional filtering.

**Query Parameters:**
- `status=todo,in_progress,done` (comma-separated)
- `priority=high,urgent`
- `assignee_id=1` (user ID)
- `due_before=2026-04-30` (date)
- `sort=due_date` (field to sort by)
- `order=asc` (asc/desc)
- `page=1, per_page=50` (pagination)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "OC1, 22 April 2026",
      "description": "Supervisor check OC1",
      "status": "todo",
      "priority": "normal",
      "due_date": "2026-04-22",
      "assigned_to": [ { "id": 1, "name": "Aditya Rahman" } ],
      "created_by": { "id": 2, "name": "Oscar Ibrahim" },
      "created_at": "2026-04-20T10:00:00Z",
      "updated_at": "2026-04-25T12:00:00Z"
    }
  ],
  "meta": { "total": 16, "per_page": 50, "current_page": 1 }
}
```

---

```http
GET /api/tasks/{task_id}
```
Get single task with full details + comments.

**Response:**
```json
{
  "id": "uuid",
  "title": "OC1, 22 April 2026",
  "description": "Check inventory and cash register balance",
  "status": "todo",
  "priority": "normal",
  "due_date": "2026-04-22",
  "assigned_to": [
    { "id": 1, "name": "Aditya Rahman", "position": "Supervisor" }
  ],
  "created_by": { "id": 2, "name": "Oscar Ibrahim" },
  "kanban_column": {
    "id": "uuid",
    "name": "TODO",
    "kanban_name": "Default Kanban"
  },
  "comments": [
    {
      "id": "uuid",
      "user": { "id": 1, "name": "Aditya Rahman" },
      "content": "On progress - checking inventory",
      "created_at": "2026-04-25T11:30:00Z"
    }
  ],
  "activity_log": [
    { "action": "created", "user": "Oscar Ibrahim", "timestamp": "2026-04-20T10:00:00Z" },
    { "action": "assigned_to", "user": "Oscar Ibrahim", "timestamp": "2026-04-20T10:05:00Z" }
  ],
  "created_at": "2026-04-20T10:00:00Z",
  "updated_at": "2026-04-25T12:00:00Z"
}
```

---

```http
GET /api/teams/{team_id}/documents
```
List all documents (SOP, guides, attachments).

**Query Parameters:**
- `type=sop` (filter by type)
- `is_sop=true` (only flagged SOP)
- `search=keyword` (search by name)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "SOP - Task Management",
      "type": "sop",
      "is_sop": true,
      "mime_type": "application/pdf",
      "file_size": 1024000,
      "created_by": { "id": 2, "name": "Oscar Ibrahim" },
      "created_at": "2026-04-10T10:00:00Z"
    }
  ]
}
```

---

```http
GET /api/documents/{document_id}
```
Get single document details + comments.

**Response:**
```json
{
  "id": "uuid",
  "name": "SOP - Task Management v2",
  "type": "sop",
  "is_sop": true,
  "content": "Full markdown or HTML content",
  "created_by": { "id": 2, "name": "Oscar Ibrahim" },
  "comments": [
    { "id": "uuid", "user": "Aditya Rahman", "content": "Good doc", "created_at": "..." }
  ],
  "created_at": "2026-04-10T10:00:00Z"
}
```

---

```http
GET /api/teams/{team_id}/announcements
```
List all team announcements.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "New SOP Available",
      "content": "Task management SOP v2 is now live",
      "is_pinned": true,
      "created_by": { "id": 2, "name": "Oscar Ibrahim" },
      "comment_count": 3,
      "created_at": "2026-04-25T10:00:00Z"
    }
  ]
}
```

---

```http
GET /api/announcements/{announcement_id}
```
Get single announcement with comments.

---

```http
GET /api/teams/{team_id}/messages
```
List team messages/chat (if enabled).

---

```http
GET /api/teams/{team_id}/activity-logs
```
Get audit trail for team actions.

**Query Parameters:**
- `action=created,updated,assigned` (filter by action)
- `user_id=1` (filter by user)
- `since=2026-04-24` (date range)
- `subject_type=task,document` (filter by entity type)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "task_created",
      "user": { "id": 2, "name": "Oscar Ibrahim" },
      "subject_type": "task",
      "subject_id": "uuid",
      "description": "Created task: OC1, 22 April 2026",
      "created_at": "2026-04-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "action": "task_assigned",
      "user": { "id": 2, "name": "Oscar Ibrahim" },
      "subject_type": "task",
      "subject_id": "uuid",
      "description": "Assigned Aditya Rahman to OC1, 22 April 2026",
      "created_at": "2026-04-20T10:05:00Z"
    }
  ],
  "meta": { "total": 150, "per_page": 50 }
}
```

---

### Lookup Utilities

```http
GET /api/teams/{team_id}/search?query=OC1
```
Search tasks, documents, members by keyword.

**Response:**
```json
{
  "tasks": [ ... ],
  "documents": [ ... ],
  "members": [ ... ],
  "announcements": [ ... ]
}
```

---

```http
GET /api/teams/{team_id}/entity-map
```
Get complete entity index for team (all tasks, docs, members in one call).

---

```http
POST /api/teams/{team_id}/resolve-references
```
Resolve references (e.g., expand task IDs to full objects).

**Request:**
```json
{
  "references": [
    { "type": "task", "id": "uuid" },
    { "type": "user", "id": 1 }
  ]
}
```

**Response:**
```json
{
  "resolved": [
    { "type": "task", "id": "uuid", "data": { "title": "...", "status": "..." } },
    { "type": "user", "id": 1, "data": { "name": "Aditya Rahman", "position": "..." } }
  ]
}
```

---

## Common Data Access Queries

For direct database access (when API insufficient), use:

```bash
php artisan tinker --execute '...'
```

or

```bash
php artisan db:query '...'
```

### Teams & Members

**List all teams:**
```php
Team::select('id', 'name', 'is_active')->get();
```

**Get team members with roles:**
```php
$team = Team::find($team_id);
$members = $team->users()
  ->select('users.id', 'name', 'email', 'position')
  ->withPivot('role')
  ->get();
```

**Check user role in team:**
```php
DB::table('team_user')
  ->where('team_id', $team_id)
  ->where('user_id', $user_id)
  ->first(); // returns: { team_id, user_id, role, ... }
```

**Get all admins of a team:**
```php
$team = Team::find($team_id);
$admins = $team->users()
  ->wherePivot('role', 'admin')
  ->get();
```

---

### Tasks & Status

**Get all TODO tasks for a team:**
```php
$team = Team::find($team_id);
$todoTasks = $team->tasks()
  ->where('status', 'todo')
  ->with('assignees')
  ->get();
```

**Get overdue tasks:**
```php
Task::where('team_id', $team_id)
  ->where('status', '!=', 'done')
  ->whereDate('due_date', '<', now())
  ->get();
```

**Get task with all related data:**
```php
$task = Task::with('assignees', 'comments', 'kanban_column')
  ->find($task_id);
```

**Update task status:**
```php
$task = Task::find($task_id);
$task->update(['status' => 'in_progress']);
$task->activity_logs()->create([
  'user_id' => auth()->id(),
  'action' => 'status_changed',
  'description' => "Status changed to in_progress"
]);
```

---

### Documents & SOP

**Get all SOP documents:**
```php
Document::where('is_sop', true)->get();
```

**Get team SOP:**
```php
$team = Team::find($team_id);
$sop = $team->documents()->where('is_sop', true)->first();
```

**Get all documents by type:**
```php
Document::where('team_id', $team_id)
  ->where('type', 'sop')
  ->get();
```

---

### Activity Logs & Audit

**Get team activity (last 30 days):**
```php
ActivityLog::where('team_id', $team_id)
  ->where('created_at', '>=', now()->subDays(30))
  ->orderBy('created_at', 'desc')
  ->get();
```

**Get who created/modified a task:**
```php
ActivityLog::where('subject_type', 'task')
  ->where('subject_id', $task_id)
  ->with('user')
  ->orderBy('created_at', 'desc')
  ->get();
```

---

## Best Practices for AI Agents

### 1. **Always Start with API**
```javascript
// GOOD ✅
const response = await fetch('http://localhost:8888/api/teams/uuid/context');
const data = await response.json();

// AVOID ❌
const tasks = await db.query('SELECT * FROM tasks WHERE team_id = ?');
```

### 2. **Use Context Endpoint for Speed**
```javascript
// Get everything about a team in one call
const context = await fetch('/api/teams/{team}/context');
// Returns: members, SOP signal, task summary, kanbans
```

### 3. **Prefer Status Queries Over Row Counts**
```javascript
// GOOD ✅ - Use task_summary from context
const { task_summary } = context.data;
console.log(task_summary.by_status); // { todo: 16, done: 0 }

// AVOID ❌ - Querying database multiple times
const todo = await db.count('tasks', { status: 'todo' });
const done = await db.count('tasks', { status: 'done' });
```

### 4. **Cache SOP Detection**
```javascript
// GOOD ✅ - Use has_sop signal
if (context.sop.has_sop) {
  const sop = context.sop.primary_document;
  // Use primary_document for audit
}

// AVOID ❌ - Query documents repeatedly
const docs = await fetch('/api/teams/{team}/documents?is_sop=true');
```

### 5. **Use Pagination for Large Results**
```javascript
// GOOD ✅
const page1 = await fetch('/api/teams/{team}/tasks?page=1&per_page=50');
const page2 = await fetch('/api/teams/{team}/tasks?page=2&per_page=50');

// AVOID ❌ - Loading all rows at once
const allTasks = await fetch('/api/teams/{team}/tasks');
```

### 6. **Filter Before Processing**
```javascript
// GOOD ✅
const overdue = await fetch('/api/teams/{team}/tasks?due_before=2026-04-25&status=todo');

// AVOID ❌ - Fetch all, then filter in memory
const tasks = await fetch('/api/teams/{team}/tasks');
const overdue = tasks.filter(t => t.due_date < '2026-04-25');
```

---

## Error Handling

All API endpoints return standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid params) |
| 404 | Resource not found |
| 500 | Server error |

**Example error response:**
```json
{
  "message": "Team not found",
  "error": "not_found",
  "code": 404
}
```

**Handle gracefully:**
```javascript
try {
  const response = await fetch('/api/teams/invalid-uuid');
  if (!response.ok) {
    console.log(`Error ${response.status}: ${response.statusText}`);
    return null;
  }
  return response.json();
} catch (err) {
  console.error('API error:', err.message);
}
```

---

## Performance Tips

1. **Use `context` endpoint** — Returns 7 API calls' worth of data in 1
2. **Filter at API level** — Not in JavaScript
3. **Limit page size** — Use `per_page=25` not `100`
4. **Batch requests** — Use `resolve-references` for bulk lookups
5. **Cache team context** — Team structure changes rarely
6. **Implement exponential backoff** — For transient errors

---

## Common Workflows

### Workflow 1: Team Audit (What We Did This Week)

```
1. GET /api/teams → list all teams
2. For each team:
   a. GET /api/teams/{id}/context → team summary
   b. Check context.task_summary → completion rate
   c. Check context.sop → SOP compliance
3. GET /api/teams/{id}/activity-logs → recent changes
4. Report findings
```

### Workflow 2: Task Management (Assign & Track)

```
1. GET /api/teams/{id}/tasks?status=todo → all pending
2. GET /api/tasks/{task_id} → full task details
3. POST /update (if supported) → assign + set due date
4. GET /api/teams/{id}/activity-logs → verify update
```

### Workflow 3: SOP Compliance Check

```
1. GET /api/teams/{id}/context → check context.sop
2. If has_sop = true:
   a. GET /api/documents/{sop_id} → read SOP content
   b. Parse SOP → extract requirements
   c. GET /api/teams/{id}/tasks → match tasks to SOP
3. Report gap findings
```

---

## Summary

| Task | Endpoint | Speed |
|------|----------|-------|
| Get all teams | GET /api/teams | ⚡ 10ms |
| Get team summary | GET /api/teams/{id}/context | ⚡ 50ms |
| List tasks | GET /api/teams/{id}/tasks | ⚡ 100ms |
| Get task detail | GET /api/tasks/{id} | ⚡ 50ms |
| Get SOP | GET /api/teams/{id}/context (check SOP field) | ⚡ 50ms |
| Get audit trail | GET /api/teams/{id}/activity-logs | ⚡ 200ms |

**Total for full team audit:** ~500ms (5 API calls) vs hours of database queries.

---

**Version:** 1.1.0  
**Last Updated:** Sat 2026-04-25 12:45 GMT+8  
**Maintainer:** Echo (CEO)  
**Status:** ✅ Production
