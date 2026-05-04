# API Contract — Teams

Base URL: `http://todo-app-v2.test`

Endpoint teams **tidak memerlukan autentikasi** — dapat diakses secara publik.

---

## Endpoints

| Method | Path | Route Name | Deskripsi |
|--------|------|------------|-----------|
| GET | `/api/teams` | `api.teams.index` | List semua teams (paginated) |
| GET | `/api/teams/{team}` | `api.teams.show` | Detail satu team |
| GET | `/api/teams/{team}/members` | `api.teams.members.index` | Daftar anggota team |

> `{team}` bisa berupa UUID atau slug team.

---

## 1. List Teams

```
GET /api/teams
```

### Query Parameters

| Parameter  | Type    | Required | Default | Deskripsi                              |
|------------|---------|----------|---------|----------------------------------------|
| `search`   | string  | No       | —       | Filter nama team (partial match)       |
| `is_active`| boolean | No       | —       | Filter status aktif: `true` / `false`  |
| `per_page` | integer | No       | `25`    | Jumlah item per halaman                |
| `page`     | integer | No       | `1`     | Halaman pagination                     |

### Request Example

```http
GET /api/teams?is_active=true&per_page=10
Accept: application/json
```

### Response — 200 OK

```json
{
  "data": [
    {
      "id": "019da952-d23a-72af-bb21-cfdc5b29926d",
      "name": "SPV UNIT 1",
      "slug": "spv-unit-1",
      "grouping": "team",
      "is_active": true,
      "tasks_count": 42,
      "members_count": 6,
      "documents_count": 3,
      "links": {
        "api": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d",
        "context": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/context"
      }
    }
  ],
  "links": {
    "first": "http://todo-app-v2.test/api/teams?page=1",
    "last": "http://todo-app-v2.test/api/teams?page=1",
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "per_page": 25,
    "to": 3,
    "total": 3
  }
}
```

### Response Fields

| Field            | Type    | Deskripsi                                      |
|------------------|---------|------------------------------------------------|
| `id`             | string  | UUID team                                      |
| `name`           | string  | Nama team                                      |
| `slug`           | string  | Slug unik team                                 |
| `grouping`       | string  | Tipe pengelompokan team                        |
| `is_active`      | boolean | Status aktif team                              |
| `tasks_count`    | integer | Jumlah task dalam team                         |
| `members_count`  | integer | Jumlah anggota team                            |
| `documents_count`| integer | Jumlah dokumen team                            |
| `links.api`      | string  | URL detail team                                |
| `links.context`  | string  | URL context lengkap team                       |

---

## 2. Show Team

```
GET /api/teams/{team}
```

### Request Example

```http
GET /api/teams/019da952-d23a-72af-bb21-cfdc5b29926d
Accept: application/json
```

atau menggunakan slug:

```http
GET /api/teams/spv-unit-1
Accept: application/json
```

### Response — 200 OK

```json
{
  "data": {
    "id": "019da952-d23a-72af-bb21-cfdc5b29926d",
    "name": "SPV UNIT 1",
    "slug": "spv-unit-1",
    "description": null,
    "grouping": "team",
    "is_active": true,
    "created_at": "1 month ago",
    "updated_at": "2 days ago",
    "tasks_count": 42,
    "members_count": 6,
    "documents_count": 3,
    "kanbans_count": 1,
    "announcements_count": 5,
    "messages_count": 20,
    "links": {
      "api": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d",
      "context": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/context",
      "digest": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/digest",
      "kanbans": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/kanbans",
      "tasks": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/tasks",
      "members": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/members",
      "documents": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/documents",
      "announcements": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/announcements",
      "messages": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/messages",
      "activity_logs": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/activity-logs",
      "search": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/search",
      "entity_map": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/entity-map",
      "resolve_references": "http://todo-app-v2.test/api/teams/019da952-d23a-72af-bb21-cfdc5b29926d/resolve-references"
    }
  }
}
```

---

## 3. Members

```
GET /api/teams/{team}/members
```

### Query Parameters

| Parameter  | Type    | Required | Default | Deskripsi               |
|------------|---------|----------|---------|-------------------------|
| `per_page` | integer | No       | `50`    | Jumlah item per halaman |
| `page`     | integer | No       | `1`     | Halaman pagination      |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": 4,
      "name": "Syafwan Wahyudi",
      "email": "syafwan@example.com",
      "position": "SPV Area Banjarmasin",
      "role": "member"
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

---

## Contoh dari Laravel HTTP Client

```php
// List semua team aktif
$teams = Http::get('http://todo-app-v2.test/api/teams', [
    'is_active' => true,
])->json('data');

// Ambil team_id untuk dipakai di endpoint report
$teamId = collect($teams)->firstWhere('slug', 'spv-unit-1')['id'];

// Lalu hit endpoint report internal
$recap = Http::withToken(env('KPI_APP_SECRET_KEY'))
    ->get('http://todo-app-v2.test/api/v1/internal/reports/monthly-tasks/recap-per-user', [
        'month'   => '2026-04',
        'team_id' => $teamId,
    ])->json('data');
```

---

## Error Responses

| Status | Kondisi |
|--------|---------|
| 404 | Team tidak ditemukan |
