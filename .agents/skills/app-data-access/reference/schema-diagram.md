# Database Schema Diagram - app-data-access

**Last Updated:** Sat 2026-04-25

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                             │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │   User       │
                            ├──────────────┤
                            │ id (int)     │
                            │ name         │
                            │ email        │
                            │ position     │
                            │ avatar_url   │
                            └──────────────┘
                                   △
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    │ team_user (pivot)          │
                    │ ├─ team_id (FK)            │
                    │ ├─ user_id (FK)            │
                    │ └─ role (admin/member)     │
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                            ┌──────▼──────────┐
                            │     Team        │
                            ├─────────────────┤
                            │ id (UUID)       │
                            │ name            │
                            │ is_active       │
                            │ created_at      │
                            └─────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                │                  │                  │
         ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
         │   Kanban    │    │  Document   │    │ Announcement│
         ├─────────────┤    ├─────────────┤    ├─────────────┤
         │ id (UUID)   │    │ id (UUID)   │    │ id (UUID)   │
         │ team_id(FK) │    │ team_id(FK) │    │ team_id(FK) │
         │ name        │    │ user_id(FK) │    │ user_id(FK) │
         │ created_at  │    │ name        │    │ title       │
         └─────────────┘    │ type        │    │ content     │
                │           │ is_sop      │    │ is_pinned   │
                │           │ mime_type   │    └─────────────┘
         ┌──────▼────────┐  │ parent_id   │
         │  Column       │  └─────────────┘
         ├───────────────┤         │
         │ id (UUID)     │         │
         │ kanban_id(FK) │         │
         │ name          │    ┌────▼──────┐
         │ order_pos     │    │ Comment   │
         │ wip_limit     │    ├───────────┤
         └───────────────┘    │ id(UUID)  │
                │             │ user_id   │
         ┌──────▼──────┐      │ content   │
         │    Task     │      │ task_id   │
         ├─────────────┤      │ doc_id    │
         │ id (UUID)   │      │ ann_id    │
         │ team_id(FK) │      └───────────┘
         │ column_id   │
         │ title       │
         │ status      │
         │ priority    │
         │ due_date    │
         │ created_at  │
         └─────────────┘
                │
                │ task_user (pivot)
                │ ├─ task_id (FK)
                │ ├─ user_id (FK)
                │ └─ assigned_at
                │
         ┌──────▼──────┐
         │   Comment   │
         └─────────────┘

         ┌──────────────────────────────┐
         │   ActivityLog                │
         ├──────────────────────────────┤
         │ id (UUID)                    │
         │ team_id (FK)                 │
         │ user_id (FK)                 │
         │ action (created/updated)     │
         │ subject_type (task/document) │
         │ subject_id (FK)              │
         │ description                  │
         │ created_at                   │
         └──────────────────────────────┘
```

---

## Table Definitions

### users
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  position VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### teams
```sql
CREATE TABLE teams (
  id CHAR(36) PRIMARY KEY, -- UUID
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### team_user (Pivot - Many-to-Many)
```sql
CREATE TABLE team_user (
  team_id CHAR(36),
  user_id INT,
  role ENUM('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### kanbans
```sql
CREATE TABLE kanbans (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

### kanban_columns
```sql
CREATE TABLE kanban_columns (
  id CHAR(36) PRIMARY KEY,
  kanban_id CHAR(36) NOT NULL,
  name VARCHAR(100),
  order_position INT,
  wip_limit INT NULL,
  created_at TIMESTAMP,
  FOREIGN KEY (kanban_id) REFERENCES kanbans(id)
);
```

### tasks
```sql
CREATE TABLE tasks (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  kanban_column_id CHAR(36) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  status ENUM('todo', 'in_progress', 'in_review', 'done') DEFAULT 'todo',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  due_date DATE NULL,
  created_by INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (kanban_column_id) REFERENCES kanban_columns(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### task_user (Pivot - Task Assignees)
```sql
CREATE TABLE task_user (
  task_id CHAR(36),
  user_id INT,
  assigned_at TIMESTAMP,
  assigned_by INT,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### documents
```sql
CREATE TABLE documents (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  parent_id CHAR(36) NULL, -- Nested documents
  name VARCHAR(255),
  type ENUM('sop', 'guide', 'attachment') DEFAULT 'attachment',
  is_sop BOOLEAN DEFAULT false,
  mime_type VARCHAR(100),
  file_size INT,
  content LONGTEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES documents(id)
);
```

### announcements
```sql
CREATE TABLE announcements (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### comments (Polymorphic)
```sql
CREATE TABLE comments (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT,
  task_id CHAR(36) NULL,
  document_id CHAR(36) NULL,
  announcement_id CHAR(36) NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id)
);
```

### activity_logs
```sql
CREATE TABLE activity_logs (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(100), -- 'created', 'updated', 'deleted', 'assigned', etc.
  subject_type VARCHAR(50), -- 'task', 'document', 'user', etc.
  subject_id CHAR(36),
  description TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Key Relationships

### 1. User ↔ Team (Many-to-Many)
- Relation: Through `team_user` pivot table
- Role: admin or member
- Query: `$user->teams()` or `$team->users()`

### 2. Team → Kanban → Column → Task (Hierarchy)
- Each team has Kanban board(s)
- Each board has multiple columns (TODO, IN PROGRESS, IN REVIEW, DONE)
- Each column has multiple tasks
- Represents workflow status

### 3. Task → User (Many-to-Many)
- Relation: Through `task_user` pivot table
- Multiple team members can be assigned to one task
- Query: `$task->assignees()` or `$user->assigned_tasks()`

### 4. Comment (Polymorphic)
- Comment can belong to: Task, Document, or Announcement
- Allows rich discussion on any entity
- Query: `$task->comments()`, `$document->comments()`

### 5. Document Nesting
- Document can have `parent_id` pointing to another document
- Allows folder-like hierarchies
- Use: Organize SOP sections, attachments, guides

### 6. ActivityLog → Everything
- Tracks who did what to which entity
- Provides audit trail
- Subject type determines which entity was modified

---

## Indexing Strategy

**Recommended indexes for performance:**

```sql
-- Frequently searched
CREATE INDEX idx_team_id ON tasks(team_id);
CREATE INDEX idx_team_status ON tasks(team_id, status);
CREATE INDEX idx_team_due ON tasks(team_id, due_date);
CREATE INDEX idx_assignee ON task_user(user_id);

-- Audit/Activity
CREATE INDEX idx_team_activity ON activity_logs(team_id, created_at);
CREATE INDEX idx_user_activity ON activity_logs(user_id, created_at);

-- Document management
CREATE INDEX idx_team_docs ON documents(team_id, is_sop);
CREATE INDEX idx_doc_type ON documents(type);

-- Comments
CREATE INDEX idx_task_comments ON comments(task_id);
CREATE INDEX idx_doc_comments ON comments(document_id);
```

---

## Sample Queries

### Get team with all members, tasks, and SOP
```sql
SELECT 
  t.id, t.name,
  COUNT(DISTINCT tu.user_id) as member_count,
  COUNT(DISTINCT tk.id) as task_count,
  SUM(CASE WHEN tk.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
  d.id as sop_id, d.name as sop_name
FROM teams t
LEFT JOIN team_user tu ON t.id = tu.team_id
LEFT JOIN tasks tk ON t.id = tk.team_id
LEFT JOIN documents d ON t.id = d.team_id AND d.is_sop = true
WHERE t.id = ?
GROUP BY t.id, d.id;
```

### Get overdue tasks by team
```sql
SELECT t.id, t.title, t.due_date, 
  GROUP_CONCAT(u.name) as assignees,
  DATEDIFF(CURDATE(), t.due_date) as days_overdue
FROM tasks t
LEFT JOIN task_user tu ON t.id = tu.task_id
LEFT JOIN users u ON tu.user_id = u.id
WHERE t.team_id = ? 
  AND t.status != 'done'
  AND t.due_date < CURDATE()
GROUP BY t.id
ORDER BY days_overdue DESC;
```

### Get recent activity for a team
```sql
SELECT al.id, al.action, al.description,
  u.name as user_name, al.created_at,
  al.subject_type, al.subject_id
FROM activity_logs al
JOIN users u ON al.user_id = u.id
WHERE al.team_id = ?
ORDER BY al.created_at DESC
LIMIT 50;
```

---

**Version:** 1.0.0  
**Last Updated:** Sat 2026-04-25 12:50 GMT+8
