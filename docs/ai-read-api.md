# AI Read API Guide

Dokumen ini menjelaskan AI Read API yang ditujukan untuk agent/AI. Fokus utamanya adalah payload yang stabil, ringkas, dan selalu `team-scoped` agar agent bisa memahami konteks aplikasi tanpa harus membaca banyak tabel atau resource Inertia.

## Tujuan

- Menyediakan endpoint baca data yang aman dan konsisten untuk agent.
- Mengurangi kebutuhan AI membaca database langsung atau menebak struktur relasi.
- Memberikan kontrak JSON yang cukup kaya untuk reasoning, tetapi tidak membanjiri agent dengan payload mentah Eloquent.

## Prinsip Desain

- Saat ini semua endpoint dibuka secara public tanpa authentication untuk mempermudah akses agent.
- Authorization tim sementara dinonaktifkan, jadi seluruh data AI read API dapat diakses tanpa login.
- List endpoint memakai pagination.
- Response dibungkus dengan Laravel API Resource agar struktur JSON tetap stabil.
- Field identitas selalu eksplisit: `id`, `entity_type`, `name/title`, `links.api`.

## Endpoint

### Team

- `GET /api/teams`
- `GET /api/teams/{team}`
- `GET /api/teams/{team}/context`
- `GET /api/teams/{team}/digest`
- `GET /api/teams/{team}/members`
- `GET /api/teams/{team}/kanbans`
- `GET /api/teams/{team}/announcements`
- `GET /api/announcements/{announcement}`
- `GET /api/teams/{team}/messages`
- `GET /api/teams/{team}/activity-logs`
- `GET /api/teams/{team}/search?q=...`
- `GET /api/teams/{team}/entity-map`
- `POST /api/teams/{team}/resolve-references`

### Task

- `GET /api/teams/{team}/tasks`
- `GET /api/tasks/{task}`

### Document

- `GET /api/teams/{team}/documents`
- `GET /api/documents/{document}`

## Filter yang Didukung

### `GET /api/teams`

- `search`
- `is_active`
- `per_page`

### `GET /api/teams/{team}/tasks`

- `kanban_id`
- `column_id`
- `assignee_id`
- `tag_id`
- `due_before`
- `due_after`
- `search`
- `per_page`

### `GET /api/teams/{team}/documents`

- `parent_id`
- `type`
- `search`
- `per_page`

### `GET /api/teams/{team}/activity-logs`

- `log_name`
- `event`
- `subject_type`
- `subject_id`
- `per_page`

### `GET /api/teams/{team}/search`

- `q` wajib
- `limit`

### `GET /api/teams/{team}/announcements`

- `search`
- `per_page`

### `GET /api/teams/{team}/messages`

- `search`
- `per_page`

### `POST /api/teams/{team}/resolve-references`

- `text` wajib
- `limit`

## Kontrak JSON Inti

### `GET /api/teams`

```json
{
  "data": [
    {
      "id": "team-uuid",
      "name": "Platform",
      "slug": "platform",
      "grouping": "team",
      "is_active": true,
      "tasks_count": 14,
      "members_count": 6,
      "documents_count": 9,
      "links": {
        "api": "/api/teams/team-uuid",
        "context": "/api/teams/team-uuid/context"
      }
    }
  ],
  "links": {},
  "meta": {}
}
```

### `GET /api/teams/{team}`

```json
{
  "data": {
    "id": "team-uuid",
    "name": "Platform",
    "slug": "platform",
    "description": null,
    "grouping": "team",
    "is_active": true,
    "created_at": "2 hours ago",
    "updated_at": "2 hours ago",
    "tasks_count": 14,
    "members_count": 6,
    "documents_count": 9,
    "kanbans_count": 1,
    "announcements_count": 2,
    "messages_count": 18,
    "links": {
      "api": "/api/teams/team-uuid",
      "context": "/api/teams/team-uuid/context",
      "tasks": "/api/teams/team-uuid/tasks",
      "members": "/api/teams/team-uuid/members",
      "documents": "/api/teams/team-uuid/documents",
      "activity_logs": "/api/teams/team-uuid/activity-logs",
      "search": "/api/teams/team-uuid/search"
    }
  }
}
```

### `GET /api/teams/{team}/context`

Endpoint ini adalah snapshot utama untuk AI.

```json
{
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Platform"
    },
    "members": [
      {
        "id": 1,
        "name": "Ayu",
        "email": "[email protected]",
        "position": "Engineer",
        "avatar_url": null,
        "role": "admin"
      }
    ],
    "kanbans": [
      {
        "id": "kanban-uuid",
        "name": "Main Board",
        "columns": [
          {
            "id": "column-uuid",
            "title": "Backlog",
            "order": 0,
            "is_default": true,
            "tasks_count": 4
          }
        ]
      }
    ],
    "recent_tasks": [],
    "recent_documents": [],
    "recent_announcements": [],
    "recent_messages": [],
    "recent_activity": []
  }
}
```

### `GET /api/teams/{team}/digest`

Endpoint ringkas untuk AI yang butuh “apa yang sedang terjadi sekarang”.

```json
{
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Platform"
    },
    "overdue_tasks": [],
    "tasks_due_today": [],
    "recent_announcements": [],
    "recent_messages": [],
    "latest_documents": []
  }
}
```

### `GET /api/teams/{team}/kanbans`

```json
{
  "data": [
    {
      "id": "kanban-uuid",
      "name": "Main Board",
      "columns": [
        {
          "id": "column-uuid",
          "title": "Backlog",
          "order": 0,
          "is_default": true,
          "tasks_count": 4
        }
      ]
    }
  ]
}
```

### `GET /api/teams/{team}/tasks`

```json
{
  "data": [
    {
      "id": "task-uuid",
      "entity_type": "task",
      "title": "Bangun AI read API",
      "description_excerpt": "Kontrak JSON dan endpoint baca data",
      "due_date": "in 1 day",
      "order_position": 0,
      "created_at": "2 hours ago",
      "updated_at": "2 hours ago",
      "comments_count": 3,
      "attachments_count": 0,
      "column": {
        "id": "column-uuid",
        "title": "Backlog",
        "kanban_id": "kanban-uuid"
      },
      "tags": [
        {
          "id": "tag-uuid",
          "name": "urgent",
          "color": "#ff0000"
        }
      ],
      "assignees": [
        {
          "id": 1,
          "name": "Ayu",
          "email": "[email protected]",
          "position": "Engineer",
          "avatar_url": null
        }
      ],
      "links": {
        "api": "/api/tasks/task-uuid"
      }
    }
  ],
  "links": {},
  "meta": {}
}
```

### `GET /api/tasks/{task}`

```json
{
  "data": {
    "id": "task-uuid",
    "entity_type": "task",
    "team_id": "team-uuid",
    "title": "Bangun AI read API",
    "description": "Kontrak JSON dan endpoint baca data",
    "due_date": "in 1 day",
    "order_position": 0,
    "column": {
      "id": "column-uuid",
      "title": "Backlog",
      "kanban_id": "kanban-uuid",
      "kanban_name": "Main Board"
    },
    "creator": {
      "id": 1,
      "name": "Ayu",
      "email": "[email protected]"
    },
    "tags": [],
    "assignees": [],
    "attachments": [],
    "comments": [],
    "links": {
      "api": "/api/tasks/task-uuid"
    }
  }
}
```

### `GET /api/teams/{team}/documents`

```json
{
  "data": [
    {
      "id": "document-uuid",
      "entity_type": "document",
      "team_id": "team-uuid",
      "parent_id": null,
      "type": "document",
      "name": "API Contract",
      "created_at": "2 hours ago",
      "updated_at": "2 hours ago",
      "children_count": 0,
      "comments_count": 0,
      "owner": {
        "id": 1,
        "name": "Ayu",
        "email": "[email protected]"
      },
      "links": {
        "api": "/api/documents/document-uuid"
      }
    }
  ]
}
```

### `GET /api/documents/{document}`

```json
{
  "data": {
    "id": "document-uuid",
    "entity_type": "document",
    "team_id": "team-uuid",
    "parent_id": null,
    "type": "document",
    "name": "API Contract",
    "content": "Draft kontrak JSON",
    "owner": {
      "id": 1,
      "name": "Ayu",
      "email": "[email protected]"
    },
    "parent": null,
    "children": [],
    "attachments": [],
    "comments": [],
    "links": {
      "api": "/api/documents/document-uuid"
    }
  }
}
```

### `GET /api/teams/{team}/announcements`

```json
{
  "data": [
    {
      "id": "announcement-uuid",
      "entity_type": "announcement",
      "title": "API Rollout",
      "content_excerpt": "Semua endpoint baru siap dipakai.",
      "created_at": "2 hours ago",
      "updated_at": "2 hours ago",
      "comments_count": 1,
      "author": {
        "id": 1,
        "name": "Ayu",
        "email": "[email protected]"
      },
      "links": {
        "api": "/api/announcements/announcement-uuid"
      }
    }
  ]
}
```

### `GET /api/announcements/{announcement}`

```json
{
  "data": {
    "id": "announcement-uuid",
    "entity_type": "announcement",
    "team_id": "team-uuid",
    "title": "API Rollout",
    "content": "Semua endpoint baru siap dipakai.",
    "author": {
      "id": 1,
      "name": "Ayu",
      "email": "[email protected]"
    },
    "attachments": [],
    "comments": [],
    "links": {
      "api": "/api/announcements/announcement-uuid"
    }
  }
}
```

### `GET /api/teams/{team}/messages`

```json
{
  "data": [
    {
      "id": "message-uuid",
      "body": "Spec awal siap direview",
      "created_at": "2 hours ago",
      "updated_at": "2 hours ago",
      "user": {
        "id": 1,
        "name": "Ayu",
        "avatar_url": null
      },
      "attachments": []
    }
  ]
}
```

### `GET /api/teams/{team}/activity-logs`

```json
{
  "data": [
    {
      "id": 1,
      "log_name": "task",
      "event": "created",
      "description": "Task AI read API dibuat",
      "properties": null,
      "created_at": "2 hours ago",
      "subject": {
        "type": "Task",
        "id": "task-uuid",
        "label": "Bangun AI read API"
      },
      "causer": {
        "type": "User",
        "id": 1,
        "label": "Ayu"
      }
    }
  ]
}
```

### `GET /api/teams/{team}/search?q=api`

```json
{
  "query": "api",
  "team_id": "team-uuid",
  "results": {
    "tasks": [
      {
        "type": "task",
        "id": "task-uuid",
        "label": "Bangun AI read API",
        "description": "Kontrak JSON dan endpoint baca data",
        "meta": {
          "due_date": "in 1 day"
        },
        "links": {
          "api": "/api/tasks/task-uuid"
        }
      }
    ],
    "documents": [],
    "members": [],
    "announcements": []
  }
}
```

### `GET /api/teams/{team}/entity-map`

```json
{
  "team_id": "team-uuid",
  "tasks": [
    {
      "id": "task-uuid",
      "label": "Bangun AI read API"
    }
  ],
  "members": [
    {
      "id": 1,
      "label": "Ayu"
    }
  ],
  "documents": [
    {
      "id": "document-uuid",
      "label": "API Contract"
    }
  ],
  "columns": [
    {
      "id": "column-uuid",
      "label": "Backlog"
    }
  ]
}
```

### `POST /api/teams/{team}/resolve-references`

```json
{
  "text": "api contract rizky",
  "team_id": "team-uuid",
  "matches": [
    {
      "type": "task",
      "id": "task-uuid",
      "label": "Bangun AI read API",
      "description": "Kontrak JSON dan endpoint baca data",
      "meta": {
        "confidence": 0.9
      },
      "links": {
        "api": "/api/tasks/task-uuid"
      }
    }
  ]
}
```

## Panduan Implementasi

- Tambahkan endpoint baru hanya jika payload list atau detail yang sudah ada memang tidak cukup.
- Untuk list baru, prioritaskan summary resource; jangan kirim relasi dalam dan blob besar.
- Untuk detail baru, sertakan relasi yang benar-benar dipakai agent untuk reasoning.
- Jika entity milik tim, selalu authorize lewat membership tim.
- Jika payload mulai besar, pindahkan field berat menjadi endpoint detail terpisah.

## Catatan

- Mode sekarang adalah `open/public read API`. Jika nanti perlu dikunci lagi, lapisan pertama yang perlu dikembalikan adalah middleware route dan authorization di controller.
- `resolve-references` memakai route `team-scoped` agar authorization tetap sederhana dan agent tidak perlu mengirim `team_id` terpisah di body.
- `entity-map` ditujukan untuk lookup cepat nama ke ID, bukan untuk membaca detail entity.
- `digest` cocok sebagai entry point ringan sebelum agent memutuskan endpoint detail mana yang perlu diambil berikutnya.
