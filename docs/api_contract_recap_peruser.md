# API Contract — Monthly Task Report Recap Per User

## Endpoint

```
GET /api/v1/reports/monthly-tasks/recap-per-user
```

**Base URL:** `http://todo-app-v2.test`

---

## Authentication

Requires Bearer token via Laravel Sanctum.

```
Authorization: Bearer {token}
```

Hanya dapat diakses oleh user dengan role `superadmin` atau `admin`.

---

## Query Parameters

| Parameter | Type   | Required | Default        | Deskripsi                          |
|-----------|--------|----------|----------------|------------------------------------|
| `month`   | string | No       | Bulan berjalan | Format `Y-m`, contoh: `2026-04`    |
| `team_id` | string | No       | Team pertama   | UUID team, contoh: `019da952-...`  |

---

## Request Example

```http
GET /api/v1/reports/monthly-tasks/recap-per-user?month=2026-04&team_id=019da952-d23a-72af-bb21-cfdc5b29926d
Authorization: Bearer {token}
Accept: application/json
```

---

## Response — 200 OK

```json
{
  "data": {
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
    "source_task_count": 42,
    "recap_per_user": [
      {
        "member_key": "user:4",
        "name": "Syafwan Wahyudi",
        "position": "SPV Area Banjarmasin",
        "team_name": "SPV UNIT 1",
        "work_days": 26,
        "jumlah_task": 7,
        "total_score": 2339,
        "skor_maksimal": 3003,
        "target_score": 11154,
        "max_score_per_task": 429,
        "compliance_persen": "77.9",
        "target_compliance": "21.0",
        "performance_label": "good",
        "kpi_status": "tidak_memenuhi"
      },
      {
        "member_key": "user:10",
        "name": "Meli Fatimah",
        "position": "SPV Area Tanah Laut",
        "team_name": "SPV UNIT 1",
        "work_days": 26,
        "jumlah_task": 7,
        "total_score": 1903,
        "skor_maksimal": 3003,
        "target_score": 11154,
        "max_score_per_task": 429,
        "compliance_persen": "63.4",
        "target_compliance": "17.1",
        "performance_label": "good",
        "kpi_status": "tidak_memenuhi"
      }
    ]
  }
}
```

---

## Response Fields

### Root

| Field               | Type    | Deskripsi                                      |
|---------------------|---------|------------------------------------------------|
| `id`                | integer | ID record report                               |
| `month`             | string  | Bulan report format `Y-m`                      |
| `report_month`      | string  | Tanggal awal bulan format `Y-m-d`              |
| `platform`          | string  | Platform scoring yang digunakan                |
| `team`              | object  | Informasi team                                 |
| `generated_at`      | string  | Waktu report digenerate (`Y-m-d H:i:s`)        |
| `source_task_count` | integer | Jumlah task yang menjadi sumber data report    |
| `recap_per_user`    | array   | Daftar rekap performa per anggota tim          |

### `recap_per_user[]`

| Field                | Type    | Deskripsi                                             |
|----------------------|---------|-------------------------------------------------------|
| `member_key`         | string  | Identifier unik member, format `user:{id}`            |
| `name`               | string  | Nama anggota tim                                      |
| `position`           | string  | Jabatan / posisi anggota                              |
| `team_name`          | string  | Nama tim                                              |
| `work_days`          | integer | Jumlah hari kerja dalam bulan tersebut                |
| `jumlah_task`        | integer | Jumlah task yang dikerjakan                           |
| `total_score`        | integer | Total skor aktual yang diraih                         |
| `skor_maksimal`      | integer | Skor maksimal yang bisa diraih dari task yang ada     |
| `target_score`       | integer | Target skor yang harus dicapai                        |
| `max_score_per_task` | integer | Skor maksimal per task                                |
| `compliance_persen`  | string  | Persentase compliance aktual (dari skor maksimal)     |
| `target_compliance`  | string  | Persentase compliance terhadap target skor            |
| `performance_label`  | string  | Label performa: `excellent`, `good`, `watch`, `poor`  |
| `kpi_status`         | string  | Status KPI: `memenuhi` atau `tidak_memenuhi`          |

---

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "message": "This action is unauthorized."
}
```

### 404 Not Found
```json
{
  "message": "Report bulanan belum pernah digenerate."
}
```

### 422 Unprocessable Entity
```json
{
  "message": "The month field must match the format Y-m.",
  "errors": {
    "month": ["The month field must match the format Y-m."]
  }
}
```

---

## Notes

- Endpoint ini hanya mengembalikan data `recap_per_user` dari report yang sudah digenerate — tidak men-trigger proses generate baru.
- Jika `recap_per_user` kosong (`null`) pada record report, array `recap_per_user` akan dikembalikan sebagai `[]`.
- `performance_label` dan `kpi_status` ditentukan saat proses generate report berdasarkan threshold yang dikonfigurasi.
