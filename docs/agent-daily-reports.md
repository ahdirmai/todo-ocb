# Agent Daily Reports API — Panduan OpenClaw

Dokumen ini menjelaskan endpoint laporan harian manager untuk digunakan oleh Agent Openclaw. Endpoint ini mengembalikan data laporan H-1 Manager HR, Manager Operasional, dan Manager Gudang beserta siapa saja yang belum submit.

## Endpoint

```
GET /api/reports/daily-manager?date=YYYY-MM-DD
```

- **Public** — tidak perlu authentication/secret key
- **Default date** = kemarin (H-1)
- **Managers covered**: Manager HR, Manager Operasional, Manager Gudang
- **Response**: `{ date, reports, pending }`

## Parameter

| Parameter | Wajib | Default | Deskripsi |
|-----------|-------|---------|-----------|
| `date` | Tidak | H-1 (`now()->subDay()`) | Target tanggal laporan (format: `YYYY-MM-DD`) |

## Response Shape

```json
{
  "date": "2026-06-12",
  "reports": [
    {
      "id": "019ebac0-d17d-72c8-9d36-5e2870fb2ff7",
      "user": {
        "id": 13,
        "name": "Maulana Ilyas",
        "email": "maulanailyas58866@gmail.com",
        "job_position": {
          "name": "Manager Gudang"
        }
      },
      "fields": {
        "recap": "",
        "action_plan": "asdasdss"
      },
      "report_fields": [
        {
          "field_key": "recap",
          "field_label": "Rekap Pengawasan 5 Divisi Gudang & Kurir",
          "field_type": "textarea",
          "field_options": { "rows": 5, "max_length": 3000, "placeholder": "..." },
          "group_label": "Rekap Pengawasan",
          "is_required": true,
          "sort_order": 1
        }
      ],
      "tasks": [
        {
          "id": "task-uuid",
          "title": "QRIS - Cek Toko Harian",
          "description": "Pastikan semua toko sudah melakukan scan QRIS",
          "category": "Audit Toko",
          "task_name": "QRIS Harian",
          "weight": 5.0,
          "is_verified": true,
          "is_done": true,
          "comment_count": 2,
          "has_media": true,
          "comments": [
            {
              "id": "comment-uuid",
              "content": "Foto bukti scan QRIS sudah dilampirkan",
              "created_at": "2026-06-12T10:30:00.000000Z",
              "parent_id": null,
              "user": {
                "id": 13,
                "name": "Maulana Ilyas"
              },
              "media": [
                {
                  "id": 1,
                  "file_name": "bukti_scan.jpg",
                  "mime_type": "image/jpeg",
                  "original_url": "https://..."
                }
              ]
            }
          ]
        }
      ],
      "submitted_at": "2026-06-12 15:46:48",
      "is_late": false
    }
  ],
  "pending": [
    {
      "user": {
        "id": 12,
        "name": "Ahmad Mujahid",
        "email": "ocbgroup.recruitment@gmail.com",
        "job_position": {
          "name": "Manager HR"
        }
      },
      "report_fields": [
        {
          "field_key": "absensi.hadir_tepat_waktu",
          "field_label": "Hadir Tepat Waktu",
          "field_type": "text",
          "field_options": { "placeholder": "Jumlah karyawan" },
          "group_label": "1. ABSENSI HARI INI (210 karyawan)",
          "is_required": true,
          "sort_order": 1
        }
      ]
    }
  ]
}
```

## Field Definitions

| Key | Deskripsi |
|-----|-----------|
| `reports` | Array laporan yang sudah disubmit manager |
| `reports[].id` | UUID laporan |
| `reports[].user` | Data user manager (id, name, email, job_position) |
| `reports[].fields` | Konten laporan — key-value sesuai position field template |
| `reports[].report_fields` | Template field definition untuk posisi manager ini |
| `reports[].tasks` | Array KPI task yang dibuat manager pada hari itu |
| `reports[].tasks[].id` | UUID task |
| `reports[].tasks[].title` | Judul task |
| `reports[].tasks[].category` | Kategori KPI (dari KpiTaskDefinition) |
| `reports[].tasks[].task_name` | Nama task dari definisi KPI |
| `reports[].tasks[].weight` | Bobot task dalam % |
| `reports[].tasks[].is_verified` | Boolean — sudah diverifikasi |
| `reports[].tasks[].is_done` | Boolean — alias dari is_verified |
| `reports[].tasks[].comment_count` | Jumlah komentar pada task |
| `reports[].tasks[].has_media` | Boolean — ada lampiran di komentar |
| `reports[].tasks[].comments` | Array komentar (dengan user + media) |
| `reports[].submitted_at` | Waktu submit |
| `reports[].is_late` | Boolean — true jika submit setelah 22:30 WITA |
| `pending` | Array manager yang BELUM submit laporan untuk tanggal ini |
| `pending[].user` | Data user manager |
| `pending[].report_fields` | Template field definition — agent bisa pakai ini untuk tahu field apa saja yang harus diisi |

## Cara Pakai oleh OpenClaw

### 1. Cek laporan kemarin (default)

```
GET /api/reports/daily-manager
```

Agent tinggal panggil endpoint ini tanpa parameter. Response otomatis berisi laporan kemarin.

### 2. Cek laporan tanggal spesifik

```
GET /api/reports/daily-manager?date=2026-06-12
```

Gunakan jika butuh laporan dari tanggal tertentu (bukan H-1).

### 3. Analisis siapa yang belum lapor

Dari response, lihat array `pending`. Setiap entry di `pending` adalah manager yang belum submit. Agent bisa:
- Catat siapa saja yang belum lapor
- Lihat `report_fields` untuk tahu field apa yang harus diisi
- Gunakan data ini untuk reminder atau evaluasi

### 4. Baca konten laporan

Setiap report di array `reports` punya `fields` — ini adalah konten laporan yang sudah diisi manager. Struktur `fields` berbeda per posisi (lihat `report_fields` untuk schema-nya).

### 5. Baca task manager

Setiap report juga punya array `tasks` — daftar KPI task yang dibuat manager pada hari itu. Setiap task berisi:
- `title`, `description`, `category`, `task_name`, `weight`
- `is_verified` / `is_done` — status penyelesaian
- `comment_count`, `has_media` — ringkasan aktivitas
- `comments[]` — detail komentar dengan `content`, `user`, `media[]` (attachment)

Agent bisa pakai data ini untuk evaluasi kinerja manager: berapa task yang selesai, seberapa lengkap evidence-nya, apa kendala yang dilaporkan di komentar.

## Contoh Kasus

**Request:**
```
GET /api/reports/daily-manager
```

**Interpretasi Response oleh Agent:**
- Tanggal: hari ini adalah 2026-06-15, jadi response menampilkan laporan untuk 2026-06-14
- Array `reports` berisi 1 laporan dari Manager Gudang — sudah submit dengan isi `recap` dan `action_plan`
- Report Manager Gudang punya 5 `tasks` — 3 sudah diverifikasi (`is_verified = true`), 2 masih pending
- Setiap task yang sudah diverifikasi punya komentar dengan lampiran foto (bukti scan)
- Array `pending` berisi 2 manager: Manager HR dan Manager Operasional — belum submit
- Masing-masing `pending` punya `report_fields` yang menunjukkan field apa saja yang harus diisi sesuai posisi mereka
- `is_late` pada laporan Manager Gudang = false — berarti submit sebelum 22:30 WITA

## Catatan

- Endpoint ini public. Tidak perlu token atau secret key.
- Data `report_fields` bisa berbeda per posisi manager — selalu cek isinya, jangan hardcode schema.
- `fields` hanya ada di array `reports` (sudah submit). `pending` tidak punya `fields`.
- Gunakan `pending` untuk deteksi mana manager yang belum melapor.
