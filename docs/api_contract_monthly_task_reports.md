# API Contract — Monthly Task Reports

Base URL: `http://todo-app-v2.test`

---

## Jenis Autentikasi

Ada dua kelompok endpoint dengan autentikasi berbeda:

| Kelompok | Path prefix | Auth | Digunakan oleh |
|----------|-------------|------|----------------|
| **Authenticated** | `/api/v1/reports/...` | Sanctum Bearer token (user login) | Frontend / admin panel |
| **Internal** | `/api/v1/internal/reports/...` | Secret key (service-to-service) | Backend app lain |

---

## Endpoint Authenticated (Sanctum)

> Memerlukan login user dengan role `superadmin` atau `admin`.

```http
Authorization: Bearer {sanctum_token}
```

| Method | Path | Route Name | Deskripsi |
|--------|------|------------|-----------|
| GET | `/api/v1/reports/monthly-tasks` | `api.v1.reports.monthly-tasks.index` | List semua report (paginated) |
| GET | `/api/v1/reports/monthly-tasks/show` | `api.v1.reports.monthly-tasks.show` | Detail satu report (payload lengkap) |
| GET | `/api/v1/reports/monthly-tasks/recap-per-user` | `api.v1.reports.monthly-tasks.recap-per-user` | Rekap performa per anggota |

---

## Endpoint Internal (Secret Key)

> Untuk service-to-service. Tidak memerlukan user login, cukup secret key.

Secret key dikonfigurasi di `.env`:
```env
API_SECRET_KEY=your-secret-key
```

Header yang diterima (pilih salah satu):
```http
Authorization: Bearer {API_SECRET_KEY}
```
```http
X-Secret-Key: {API_SECRET_KEY}
```

| Method | Path | Route Name | Deskripsi |
|--------|------|------------|-----------|
| GET | `/api/v1/internal/reports/monthly-tasks` | `api.v1.internal.reports.monthly-tasks.index` | List semua report (paginated) |
| GET | `/api/v1/internal/reports/monthly-tasks/recap-per-user` | `api.v1.internal.reports.monthly-tasks.recap-per-user` | Rekap performa per anggota |

### Contoh dari Laravel HTTP Client (BE project lain)

```php
Http::withToken(env('KPI_APP_SECRET_KEY'))
    ->get('http://todo-app-v2.test/api/v1/internal/reports/monthly-tasks', [
        'year'    => '2026',
        'team_id' => '019da952-d23a-72af-bb21-cfdc5b29926d',
    ]);
```

`.env` di project lain:
```env
KPI_APP_BASE_URL=http://todo-app-v2.test
KPI_APP_SECRET_KEY=a07d0aa0429bd881391ce3da84cdc475ef1ea78952521e0cb84980c96e3f7f0a
```

---

## 1. List Reports

```
GET /api/v1/reports/monthly-tasks
GET /api/v1/internal/reports/monthly-tasks
```

### Query Parameters

| Parameter | Type    | Required | Default | Deskripsi                       |
|-----------|---------|----------|---------|---------------------------------|
| `team_id` | string  | No       | —       | UUID team untuk filter per team |
| `year`    | integer | No       | —       | Tahun, contoh: `2026`           |
| `page`    | integer | No       | `1`     | Halaman pagination              |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": 5,
      "month": "2026-04",
      "report_month": "2026-04-01",
      "platform": "word-match",
      "team": {
        "id": "019da952-d23a-72af-bb21-cfdc5b29926d",
        "name": "SPV UNIT 1",
        "slug": "spv-unit-1"
      },
      "generated_at": "2026-04-30 10:00:00",
      "generated_by": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "source_task_count": 42,
      "model": "word-match-v1",
      "prompt_version": "v1"
    }
  ],
  "links": {
    "first": "http://todo-app-v2.test/api/v1/internal/reports/monthly-tasks?page=1",
    "last": "http://todo-app-v2.test/api/v1/internal/reports/monthly-tasks?page=1",
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "per_page": 20,
    "to": 1,
    "total": 1
  }
}
```

> Tidak menyertakan `payload` dan `source_snapshot`. Gunakan endpoint `/show` untuk data lengkap.

---

## 2. Show Report (Detail Lengkap)

```
GET /api/v1/reports/monthly-tasks/show
```

> Hanya tersedia untuk endpoint authenticated (Sanctum).

### Query Parameters

| Parameter | Type   | Required | Default        | Deskripsi                       |
|-----------|--------|----------|----------------|---------------------------------|
| `month`   | string | No       | Bulan berjalan | Format `Y-m`, contoh: `2026-04` |
| `team_id` | string | No       | Team pertama   | UUID team                       |

---

## 3. Recap Per User

```
GET /api/v1/reports/monthly-tasks/recap-per-user
GET /api/v1/internal/reports/monthly-tasks/recap-per-user
```

### Query Parameters

| Parameter | Type   | Required | Default        | Deskripsi                       |
|-----------|--------|----------|----------------|---------------------------------|
| `month`   | string | No       | Bulan berjalan | Format `Y-m`, contoh: `2026-04` |
| `team_id` | string | No       | Team pertama   | UUID team                       |

Lihat struktur response lengkap di [`api_contract_recap_peruser.md`](./api_contract_recap_peruser.md).

---

## Error Responses

| Status | Kondisi | Body |
|--------|---------|------|
| 401 | Secret key salah / tidak ada | `{"message": "Invalid or missing secret key."}` |
| 401 | Token Sanctum tidak valid | `{"message": "Unauthenticated."}` |
| 403 | Role tidak cukup (bukan admin/superadmin) | `{"message": "This action is unauthorized."}` |
| 404 | Report belum pernah digenerate | `{"message": "Report bulanan belum pernah digenerate."}` |
| 422 | Parameter tidak valid | `{"message": "...", "errors": {...}}` |
