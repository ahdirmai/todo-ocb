# Mobile API Contract

## Tujuan

Dokumen ini menjadi kontrak API bersama antara backend Laravel dan frontend Flutter untuk aplikasi mobile iOS/Android.

Dokumen ini sengaja membedakan dua hal:

- `Existing`: endpoint yang sudah tersedia di codebase saat ini
- `Target`: endpoint yang direkomendasikan agar mobile app punya surface API yang resmi, stabil, dan maintainable

Tujuan akhirnya adalah memastikan:

- FE Flutter tahu endpoint, request, response, error, dan capability yang tersedia
- BE Laravel tahu payload dan aturan yang harus dijaga stabil
- kontrak tidak bergantung pada route Inertia/web form desktop

## Prinsip Desain

- Semua endpoint mobile diletakkan di namespace `api`.
- Gunakan versioning, direkomendasikan `api/v1`.
- Semua response JSON konsisten.
- Semua write endpoint harus explicit dan tidak mengandalkan `return back()`.
- Semua endpoint private wajib auth.
- Semua authorization final tetap ditentukan backend policy.

## Keputusan Sinkronisasi dengan Flutter Brief

Dokumen ini harus dibaca bersama [docs/flutter/brief.md](/Users/ahdirmai/Herd/todo-app-v2/docs/flutter/brief.md).

Aturan sinkronisasinya:

- `api.md` adalah source of truth untuk detail teknis integrasi FE-BE.
- `brief.md` adalah source of truth untuk scope produk, fase delivery, dan prioritas UX mobile.
- Daftar endpoint MVP di dokumen ini harus sama dengan baseline API MVP yang disebut di brief Flutter.
- Jika backend belum punya endpoint tertentu, Flutter tidak boleh mengandalkan route web Inertia sebagai solusi permanen.
- Semua target endpoint mobile diasumsikan berada di `api/v1`.
- Semua endpoint private target diasumsikan memakai bearer token Laravel Sanctum.

## Status API Saat Ini

### Existing read API

Saat ini codebase sudah memiliki endpoint read berikut:

- `GET /api/teams`
- `GET /api/teams/{team}`
- `GET /api/teams/{team}/context`
- `GET /api/teams/{team}/digest`
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
- `GET /api/teams/{team}/search`
- `GET /api/teams/{team}/entity-map`
- `POST /api/teams/{team}/resolve-references`

### Gap utama

Belum ada contract API mobile resmi untuk:

- login/logout mobile
- current user
- task write endpoints via `/api`
- comment write endpoints via `/api`
- announcement write endpoints via `/api`
- document write endpoints via `/api`
- kanban column write endpoints via `/api`
- chat write endpoint di namespace `/api`
- upload contract yang dinormalisasi

## Rekomendasi Auth Mobile

### Target

Gunakan token auth untuk mobile via Laravel Sanctum.

### Kenapa

- Cocok untuk mobile app
- Header `Authorization: Bearer <token>`
- Mendukung device-based token
- Mudah revoke saat logout/device lost

### Target endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/me/teams`
- opsional: `POST /api/v1/auth/refresh` bila nanti memakai pendekatan berbeda

## Header Standard

### Request headers

Untuk endpoint private:

```http
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

Untuk multipart upload:

```http
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

## Format Response Standard

### Success object

Untuk entity tunggal:

```json
{
  "data": {}
}
```

Untuk list paginated:

```json
{
  "data": [],
  "links": {
    "first": null,
    "last": null,
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "path": "https://example.test/api/v1/teams",
    "per_page": 25,
    "to": 10,
    "total": 10
  }
}
```

Untuk action sukses non-list:

```json
{
  "message": "Task updated successfully.",
  "data": {}
}
```

### Error object

Validation error:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": [
      "The title field is required."
    ]
  }
}
```

Authorization / not found / business error:

```json
{
  "message": "Forbidden."
}
```

### HTTP status convention

- `200` read/update sukses
- `201` create sukses
- `202` async accepted bila nanti diperlukan
- `204` delete sukses tanpa body
- `401` unauthenticated
- `403` forbidden
- `404` not found
- `409` conflict
- `422` validation error

## Entity & Field Naming

### ID type

- `team`, `task`, `kanban`, `kanban_column`, `document`, `announcement`, `comment`, `message` memakai UUID
- `user` dan beberapa media IDs saat ini integer

### Date convention

Rekomendasi target untuk mobile:

- machine-friendly ISO 8601 di semua endpoint write/read baru
- bila butuh human label, kirim field tambahan

Contoh:

```json
{
  "due_date": "2026-04-24T09:00:00Z",
  "due_date_human": "in 2 days"
}
```

Catatan:

- Existing API saat ini memakai helper humanized date pada beberapa resource.
- Untuk mobile, field ISO lebih aman sebagai kontrak utama.

## Existing Endpoint Contract

Bagian ini mendokumentasikan endpoint yang sudah ada agar tim Flutter bisa mulai integrasi read-only dengan akurat.

## Teams

### Existing: `GET /api/teams`

Filter:

- `search`
- `is_active`
- `per_page`

Response item:

```json
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
```

### Existing: `GET /api/teams/{team}`

Memberikan metadata team dan link resource terkait.

### Existing: `GET /api/teams/{team}/context`

Snapshot kaya konteks untuk team:

- team detail
- SOP summary
- members
- kanbans
- recent tasks
- recent documents
- recent announcements
- recent messages
- recent activity

Endpoint ini sangat berguna untuk screen team overview pertama.

### Existing: `GET /api/teams/{team}/digest`

Ringkasan operasional:

- overdue tasks
- tasks due today
- recent announcements
- recent messages
- latest documents

### Existing: `GET /api/teams/{team}/members`

Paginated list member team.

Response item:

```json
{
  "id": 7,
  "name": "Ayu",
  "email": "ayu@example.com",
  "position": "Engineer",
  "avatar_url": "https://...",
  "role": "admin"
}
```

### Existing: `GET /api/teams/{team}/kanbans`

Mengembalikan kanban beserta columns dan `tasks_count`.

## Tasks

### Existing: `GET /api/teams/{team}/tasks`

Filter valid saat ini:

- `kanban_id`
- `column_id`
- `assignee_id`
- `tag_id`
- `due_before`
- `due_after`
- `search`
- `per_page`

Response item existing:

```json
{
  "id": "task-uuid",
  "entity_type": "task",
  "title": "Follow up vendor",
  "description_excerpt": "Call vendor and confirm...",
  "due_date": "2 hours ago",
  "order_position": 0,
  "created_at": "1 day ago",
  "updated_at": "2 hours ago",
  "comments_count": 3,
  "attachments_count": 1,
  "column": {
    "id": "column-uuid",
    "title": "In Progress",
    "kanban_id": "kanban-uuid"
  },
  "tags": [
    {
      "id": "tag-uuid",
      "name": "Urgent",
      "color": "#ef4444"
    }
  ],
  "assignees": [],
  "links": {
    "api": "/api/tasks/task-uuid"
  }
}
```

### Existing: `GET /api/tasks/{task}`

Detail existing mencakup:

- creator
- column
- tags
- assignees
- attachments
- comments top-level dengan replies

## Documents

### Existing: `GET /api/teams/{team}/documents`

Filter valid:

- `parent_id`
- `type` with values `folder`, `document`, `file`
- `search`
- `per_page`

Response summary existing:

```json
{
  "id": "document-uuid",
  "entity_type": "document",
  "team_id": "team-uuid",
  "parent_id": null,
  "type": "document",
  "is_sop": true,
  "name": "SOP Operasional",
  "created_at": "3 days ago",
  "updated_at": "1 day ago",
  "children_count": 2,
  "comments_count": 1,
  "owner": {
    "id": 7,
    "name": "Ayu",
    "email": "ayu@example.com"
  },
  "links": {
    "api": "/api/documents/document-uuid"
  }
}
```

### Existing: `GET /api/documents/{document}`

Detail existing mencakup:

- owner
- parent
- children
- attachments
- comments

## Announcements

### Existing: `GET /api/teams/{team}/announcements`

Filter valid:

- `search`
- `per_page`

### Existing: `GET /api/announcements/{announcement}`

Detail existing mencakup:

- author
- attachments
- comments

Catatan:

- Existing API read belum mengekspos seluruh field recurrence secara eksplisit pada resource detail.
- Jika mobile perlu mengelola recurring announcement, resource detail target perlu diperluas.

## Messages

### Existing: `GET /api/teams/{team}/messages`

Filter valid:

- `search`
- `per_page`

Response item existing:

```json
{
  "id": "message-uuid",
  "body": "Siap, saya lanjutkan.",
  "created_at": "2026-04-24T10:00:00.000000Z",
  "updated_at": "2026-04-24T10:00:00.000000Z",
  "user": {
    "id": 7,
    "name": "Ayu",
    "avatar_url": "https://..."
  },
  "attachments": [
    {
      "id": 10,
      "name": "bukti.png",
      "mime": "image/png",
      "size": 120304,
      "url": "https://..."
    }
  ]
}
```

## Activity

### Existing: `GET /api/teams/{team}/activity-logs`

Filter valid:

- `log_name`
- `event`
- `subject_type`
- `subject_id`
- `per_page`

## Search

### Existing: `GET /api/teams/{team}/search?q={query}`

Mengembalikan grouped results untuk:

- tasks
- documents
- members
- announcements

### Existing: `GET /api/teams/{team}/entity-map`

Lookup ringan untuk:

- tasks
- members
- documents
- columns

### Existing: `POST /api/teams/{team}/resolve-references`

Body:

```json
{
  "text": "budget q2",
  "limit": 5
}
```

## Target API Surface untuk Mobile

Bagian ini adalah kontrak target yang direkomendasikan. Tidak semua endpoint sudah ada sekarang, tetapi ini yang sebaiknya dijadikan backlog resmi backend.

## Baseline API MVP

Daftar berikut adalah baseline yang harus dianggap sinkron dengan `docs/flutter/brief.md` agar MVP Flutter bisa dikembangkan tanpa kontradiksi scope.

### Auth & session

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/me/teams`

### Dashboard & team context

- `GET /api/v1/dashboard`
- `GET /api/v1/teams/{team}/context`
- `GET /api/v1/teams/{team}/kanbans`

### Tasks

- `GET /api/v1/teams/{team}/tasks`
- `GET /api/v1/tasks/{task}`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{task}`
- `DELETE /api/v1/tasks/{task}`
- `POST /api/v1/kanbans/tasks/reorder`

### Task comments

- `POST /api/v1/tasks/{task}/comments`
- `PATCH /api/v1/comments/{comment}`
- `DELETE /api/v1/comments/{comment}`

### Chat

- `GET /api/v1/teams/{team}/messages`
- `POST /api/v1/teams/{team}/messages`

### Announcements

- `GET /api/v1/teams/{team}/announcements`
- `GET /api/v1/announcements/{announcement}`
- `POST /api/v1/teams/{team}/announcements`
- `PATCH /api/v1/announcements/{announcement}`
- `DELETE /api/v1/announcements/{announcement}`

### Documents

- `GET /api/v1/teams/{team}/documents`
- `GET /api/v1/documents/{document}`
- `POST /api/v1/teams/{team}/documents/folders`
- `POST /api/v1/teams/{team}/documents/files`
- `POST /api/v1/teams/{team}/documents/pages`
- `PATCH /api/v1/teams/{team}/documents/{document}`
- `DELETE /api/v1/teams/{team}/documents/{document}`

### Supporting lookup

- `GET /api/v1/tags`

## Auth

### Target: `POST /api/v1/auth/login`

Body:

```json
{
  "email": "ayu@example.com",
  "password": "secret",
  "device_name": "Ayu iPhone 15"
}
```

Response:

```json
{
  "message": "Login successful.",
  "data": {
    "token": "plain-text-token",
    "token_type": "Bearer",
    "user": {
      "id": 7,
      "name": "Ayu",
      "email": "ayu@example.com",
      "position": "Engineer",
      "avatar_url": "https://...",
      "roles": [
        "member"
      ]
    }
  }
}
```

### Target: `POST /api/v1/auth/logout`

Behavior:

- revoke current access token

Response:

```json
{
  "message": "Logout successful."
}
```

### Target: `GET /api/v1/me`

Response:

```json
{
  "data": {
    "id": 7,
    "name": "Ayu",
    "email": "ayu@example.com",
    "position": "Engineer",
    "avatar_url": "https://...",
    "roles": [
      "member"
    ]
  }
}
```

## Teams Target

### Target: `GET /api/v1/me/teams`

Purpose:

- hanya team yang user punya akses

Catatan:

- Ini lebih cocok untuk mobile daripada `GET /api/teams` tanpa filter auth-context.

### Target: `GET /api/v1/teams`

Boleh dipertahankan untuk admin/global role, tetapi behavior-nya harus jelas apakah scoped atau seluruh team.

## Tasks Target

### Target: `POST /api/v1/tasks`

Multipart/form-data.

Fields:

- `team_id` required UUID
- `kanban_column_id` required UUID
- `title` required string max 255
- `description` nullable string
- `due_date` nullable ISO datetime
- `attachments[]` optional file array

Response:

```json
{
  "message": "Task created successfully.",
  "data": {
    "id": "task-uuid"
  }
}
```

### Target: `PATCH /api/v1/tasks/{task}`

JSON atau multipart jika upload attachment.

Fields:

- `title` optional
- `description` nullable
- `due_date` nullable
- `kanban_column_id` optional
- `order_position` optional integer
- `tag_ids[]` optional UUID array
- `assignee_ids[]` optional integer array
- `attachments[]` optional file array

Catatan:

- FE boleh mengirim partial update
- Response ideal mengembalikan `TaskDetailResource` terbaru

### Target: `DELETE /api/v1/tasks/{task}`

Response:

- `204 No Content`

### Target: `POST /api/v1/kanbans/tasks/reorder`

Body:

```json
{
  "tasks": [
    {
      "id": "task-uuid",
      "kanban_column_id": "column-uuid",
      "order_position": 0
    }
  ]
}
```

Response:

```json
{
  "message": "Tasks reordered successfully."
}
```

## Task Comments Target

### Target: `POST /api/v1/tasks/{task}/comments`

Multipart/form-data.

Fields:

- `content` required string
- `parent_id` nullable UUID
- `attachments[]` optional files

### Target: `PATCH /api/v1/comments/{comment}`

Multipart/form-data bila ada attachment.

Fields:

- `content` required string
- `new_attachments[]` optional files
- `removed_media_ids[]` optional integer array

### Target: `DELETE /api/v1/comments/{comment}`

Response:

- `204 No Content`

## Chat Target

### Target: `GET /api/v1/teams/{team}/messages`

Reuse existing response shape, tetapi private/authenticated.

### Target: `POST /api/v1/teams/{team}/messages`

Multipart/form-data.

Fields:

- `body` nullable string max 4000
- `attachments[]` optional files

Validation:

- minimal salah satu: body atau attachment

Response:

```json
{
  "message": "Message sent successfully.",
  "data": {
    "id": "message-uuid",
    "body": "Siap",
    "created_at": "2026-04-24T10:00:00Z",
    "user": {
      "id": 7,
      "name": "Ayu",
      "avatar_url": "https://..."
    },
    "attachments": []
  }
}
```

## Announcements Target

### Target: `POST /api/v1/teams/{team}/announcements`

Multipart/form-data.

Fields:

- `title` nullable string max 255
- `content` required string
- `attachments[]` optional files
- `is_recurring` boolean
- `recurrence_frequency` optional enum
- `recurrence_interval` optional integer
- `recurrence_time` optional `HH:mm`
- `recurrence_weekday` optional int 1..7
- `recurrence_month_day` optional int 1..31
- `recurrence_limit_unit` optional enum
- `recurrence_limit_value` optional int

### Target: `PATCH /api/v1/announcements/{announcement}`

Fields:

- sama dengan create
- `new_attachments[]`
- `removed_media_ids[]`

### Target: `DELETE /api/v1/announcements/{announcement}`

Response:

- `204 No Content`

### Target: `POST /api/v1/announcements/{announcement}/comments`

Kontrak sama seperti task comments.

## Documents Target

### Target: `GET /api/v1/teams/{team}/documents`

Reuse filter existing:

- `parent_id`
- `type`
- `search`
- `per_page`

### Target: `POST /api/v1/teams/{team}/documents/folders`

Body:

```json
{
  "name": "SOP Finance",
  "parent_id": null
}
```

### Target: `POST /api/v1/teams/{team}/documents/files`

Multipart/form-data.

Fields:

- `parent_id` nullable UUID
- `files[]` required file array
- `is_sop` optional boolean

### Target: `POST /api/v1/teams/{team}/documents/pages`

Untuk rich document.

Fields:

- `name` required string
- `content` required string
- `is_sop` optional boolean
- `parent_id` nullable UUID
- `attachments[]` optional file array

### Target: `PATCH /api/v1/teams/{team}/documents/{document}`

Multipart/form-data bila perlu.

Fields:

- `name` required string
- `content` nullable string
- `is_sop` optional boolean
- `removed_media_ids[]` optional integer array
- `new_attachments[]` optional file array

### Target: `POST /api/v1/teams/{team}/documents/{document}/file-version`

Multipart/form-data.

Fields:

- `file` required file
- `is_sop` optional boolean

### Target: `DELETE /api/v1/teams/{team}/documents/{document}`

Response:

- `204 No Content`

## Kanban Columns Target

### Target: `POST /api/v1/kanbans/{kanban}/columns`

Body:

```json
{
  "title": "Blocked"
}
```

### Target: `PATCH /api/v1/kanbans/columns/{column}`

Body:

```json
{
  "title": "In Review"
}
```

### Target: `DELETE /api/v1/kanbans/columns/{column}`

Response:

- `204 No Content`

### Target: `POST /api/v1/kanbans/columns/reorder`

Body:

```json
{
  "columns": [
    {
      "id": "column-uuid",
      "order": 0
    }
  ]
}
```

## Members & Team Management Target

Fitur ini opsional untuk fase awal mobile, tetapi kontraknya sebaiknya tetap jelas.

### Target: `POST /api/v1/teams/{team}/members`

Body:

```json
{
  "user_id": 7,
  "role": "member"
}
```

### Target: `DELETE /api/v1/teams/{team}/members/{user}`

Response:

- `204 No Content`

## Tags Target

Tag penting untuk task UX. Saat ini belum ada read API tag khusus.

### Target: `GET /api/v1/tags`

Response item:

```json
{
  "id": "tag-uuid",
  "name": "Urgent",
  "color": "#ef4444"
}
```

### Target: `POST /api/v1/tags`

### Target: `PATCH /api/v1/tags/{tag}`

### Target: `DELETE /api/v1/tags/{tag}`

Jika mobile fase awal tidak perlu create/edit tag, cukup expose list tags.

## Dashboard Target

Saat ini dashboard member/admin/superadmin dihasilkan lewat Inertia, belum ada API mobile khusus.

Rekomendasi:

### Target: `GET /api/v1/dashboard`

Response shape:

- role
- headline
- stats
- dueSoon
- activityFeed
- teamSnapshots
- admin-specific blocks bila role admin/superadmin

Tujuannya agar mobile tidak perlu merakit dashboard dari banyak endpoint kecil.

## Upload Contract

## General rules

- Semua upload endpoint mendukung `multipart/form-data`
- Media response distandarkan ke format:

```json
{
  "id": 10,
  "name": "foto.jpg",
  "mime": "image/jpeg",
  "size": 120304,
  "url": "https://example.test/storage/..."
}
```

### Current upload limits from config

- `max_file_kb`: `20480`
- `max_attachments`: `5` pada beberapa flow dokumen
- allowed mimes:
  - `pdf`
  - `doc`
  - `docx`
  - `xls`
  - `xlsx`
  - `png`
  - `jpg`
  - `jpeg`
  - `webp`

## Authorization Matrix Ringkas

### Task

- global admin/superadmin: full
- creator: update + delete
- team admin: update + delete
- assignee: update
- assignee non-owner non-admin: tidak boleh delete

### Comment

- owner comment: update/delete
- global admin: delete

### Document

- owner: update/delete
- global admin/superadmin: update/delete

### Announcement

- sesuai policy backend
- role final tetap divalidasi di server

## Naming & Consistency Rules

- Gunakan snake_case di request dan response
- Semua relationship object pakai nama eksplisit:
  - `creator`
  - `author`
  - `owner`
  - `assignees`
  - `attachments`
- Hindari field ambigu
- Jangan campur date human-readable sebagai field utama

## Rekomendasi Implementasi Backend

### 1. Pisahkan mobile API dari web controller Inertia

Jangan gunakan controller web yang `return back()` sebagai surface utama mobile.

### 2. Tambahkan namespace baru

Direkomendasikan:

- `App\Http\Controllers\Api\V1\...`

### 3. Lindungi route private

Gunakan middleware auth token mobile, direkomendasikan `auth:sanctum`.

### 4. Normalisasi resource

Buat resource API mobile yang:

- machine-friendly
- field date konsisten
- tidak terlalu bergantung pada format humanized

### 5. Tambahkan contract tests

Minimal:

- auth success/failure
- validation errors
- authorization errors
- JSON structure snapshot untuk entity utama

## Rekomendasi Implementasi Flutter

- Konsumsi hanya endpoint di dokumen ini
- Jangan memanggil route web Inertia
- Simpan entity model yang typed
- Pisahkan DTO dan domain model
- Siapkan adapter untuk paginated response
- Gunakan upload abstraction tunggal untuk task/comment/document/chat/announcement

## Daftar Endpoint Prioritas Implementasi Backend

Urutan yang direkomendasikan:

1. `POST /api/v1/auth/login`
2. `POST /api/v1/auth/logout`
3. `GET /api/v1/me`
4. `GET /api/v1/dashboard`
5. `GET /api/v1/me/teams`
6. `GET /api/v1/teams/{team}/context`
7. `GET /api/v1/teams/{team}/tasks`
8. `GET /api/v1/tasks/{task}`
9. `POST /api/v1/tasks`
10. `PATCH /api/v1/tasks/{task}`
11. `DELETE /api/v1/tasks/{task}`
12. `POST /api/v1/tasks/{task}/comments`
13. `PATCH /api/v1/comments/{comment}`
14. `DELETE /api/v1/comments/{comment}`
15. `GET /api/v1/teams/{team}/messages`
16. `POST /api/v1/teams/{team}/messages`
17. `GET /api/v1/teams/{team}/announcements`
18. `GET /api/v1/announcements/{announcement}`
19. `POST /api/v1/teams/{team}/announcements`
20. `PATCH /api/v1/announcements/{announcement}`
21. `DELETE /api/v1/announcements/{announcement}`
22. `GET /api/v1/teams/{team}/documents`
23. `GET /api/v1/documents/{document}`
24. `POST /api/v1/teams/{team}/documents/folders`
25. `POST /api/v1/teams/{team}/documents/files`
26. `POST /api/v1/teams/{team}/documents/pages`
27. `PATCH /api/v1/teams/{team}/documents/{document}`
28. `DELETE /api/v1/teams/{team}/documents/{document}`
29. `GET /api/v1/tags`

## Referensi

- Existing AI read API: [docs/ai-read-api.md](/Users/ahdirmai/Herd/todo-app-v2/docs/ai-read-api.md)
- Flutter authenticated requests: [https://docs.flutter.dev/cookbook/networking/authenticated-requests](https://docs.flutter.dev/cookbook/networking/authenticated-requests)
- Flutter architecture guide: [https://docs.flutter.dev/app-architecture/guide](https://docs.flutter.dev/app-architecture/guide)
- Laravel Sanctum: [https://laravel.com/docs/13.x/sanctum](https://laravel.com/docs/13.x/sanctum)
