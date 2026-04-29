---
name: kpi-progress-auditor
description: >
  Audit KPI/Progress task per team berdasarkan SOP dan Kanban Board.
  Mengambil data dari API (dependency: app-data-access), parsing SOP,
  mencocokkan dengan Column Kanban, lalu scoring evidence per task.
  Aktivasi saat: audit KPI, cek progress team, laporan performa SPV,
  scoring task, evaluasi SOP compliance, atau review kinerja anggota.
---

# kpi-progress-auditor — Audit KPI & Progress Task

**Digunakan oleh:** OpenClaw (AI Assistant)  
**Dependency:** [`app-data-access`](../app-data-access/SKILL.md) (wajib dibaca terlebih dahulu)  
**API Host:** Sesuai konfigurasi di `app-data-access` (default: `localhost:8888`)  
**Bahasa Laporan:** Indonesia  
**Status:** ✅ Production Ready

---

## Kapan Mengaktifkan Skill Ini

Aktifkan ketika user meminta:
- Audit KPI / progress task suatu team
- Cek performa individu (SPV / anggota)
- Laporan scoring per task berdasarkan SOP
- Evaluasi evidence / bukti kerja di Kanban
- Perbandingan skor antar anggota team

---

## Alur Kerja Utama

```
┌─────────────────────────────────────────────────────────┐
│  TAHAP 1: Ambil Context Team                            │
│  GET /api/teams/{team_id}/context                       │
│  → Cek sop.has_sop                                      │
├──────────┬──────────────────────────────────────────────┤
│ has_sop  │ Aksi                                         │
│ = false  │ ⛔ STOP — Laporkan: "Team belum punya SOP"   │
│ = true   │ ✅ Lanjut ke Tahap 2                         │
└──────────┴──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TAHAP 2: Ambil & Parse SOP                             │
│  GET /api/documents/{sop_id}                            │
│  → Parse content (longtext / PDF link)                  │
│  → Hasilkan JSON steps[]                                │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TAHAP 3: Ambil Kanban Columns                          │
│  GET /api/teams/{team_id}/kanbans                       │
│  → Ambil semua columns (urut by order_position)         │
│  → INI ADALAH ACUAN UTAMA                               │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TAHAP 4: Mapping SOP ↔ Kanban Columns                  │
│  → Column Kanban = sumber kebenaran                     │
│  → SOP step tanpa column Kanban = DIABAIKAN             │
│  → Column Kanban tanpa SOP step = TETAP DIHITUNG        │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TAHAP 5: Ambil Semua Task + Detail                     │
│  GET /api/teams/{team_id}/tasks                         │
│  → Untuk setiap task:                                   │
│    GET /api/tasks/{task_id}  (ambil comments)            │
│  → Scoring per column per task                          │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TAHAP 6: Hitung Skor & Generate Laporan                │
│  → Detail per task (tabel)                              │
│  → Ringkasan per individu (tabel)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Tahap 1: Ambil Context Team

```
GET /api/teams/{team_id}/context
```

Periksa field `sop`:
```json
{
  "sop": {
    "has_sop": true,
    "primary_document": { "id": "uuid", "name": "SOP - Laporan SPV" }
  }
}
```

**Jika `has_sop = false`:**
```
⛔ Team [Nama Team] belum memiliki dokumen SOP.
   Audit tidak dapat dilakukan. Silakan buat SOP terlebih dahulu.
```

---

## Tahap 2: Parse SOP → JSON Steps

Ambil konten SOP:
```
GET /api/documents/{sop_id}
```

Parse konten SOP (bisa longtext/HTML atau referensi PDF) menjadi format JSON berikut:

```json
{
  "steps": [
    {
      "id": "S1",
      "name": "Nama Langkah",
      "action": "aksi eksplisit yang harus dilakukan",
      "required_evidence": "comment | media | both",
      "keywords": ["keyword1", "keyword2"],
      "weight": 3,
      "priority": "high",
      "min_comment": 1,
      "min_media": 0,
      "sequence_order": 1,
      "expected_column": "Nama Column Kanban (perkiraan)",
      "is_mandatory": true
    }
  ]
}
```

### Panduan Parsing

| Field | Cara Menentukan |
|-------|----------------|
| `name` | Judul/heading langkah di SOP |
| `action` | Deskripsi aksi dari paragraf SOP |
| `required_evidence` | `both` jika SOP menyebut "foto/screenshot", `comment` jika hanya teks |
| `keywords` | Kata kunci spesifik di SOP (misal: "absen", "saldo", "iPOS") |
| `weight` | 1-5 berdasarkan kepentingan dalam SOP |
| `priority` | `high` untuk yang disebutkan berulang/ditebalkan, `medium` default |
| `min_comment` | Minimal 1 kecuali langkah opsional |
| `min_media` | 1 jika SOP minta bukti foto/video, 0 jika tidak |
| `expected_column` | Estimasi nama column Kanban yang sesuai |
| `is_mandatory` | `true` kecuali SOP menyebut "opsional" |

---

## Tahap 3: Ambil Kanban Columns

```
GET /api/teams/{team_id}/kanbans
```

Ambil **semua columns** dari Kanban Board, diurutkan berdasarkan `order_position`:

```json
[
  { "id": "uuid", "name": "PIC, TUJUAN, DAN TGL KUNJUNGAN", "order": 1 },
  { "id": "uuid", "name": "Cek Absen Kehadiran Shift Pagi", "order": 2 },
  { "id": "uuid", "name": "Cek Absen Matikan Lampu", "order": 3 },
  ...
  { "id": "uuid", "name": "PENGECEKAN TIM PENILAI KPI", "order": 33 }
]
```

---

## Tahap 4: Mapping SOP ↔ Kanban Columns

> **⚠️ ATURAN KRITIS: Column Kanban adalah ACUAN UTAMA**

| Kondisi | Aksi |
|---------|------|
| SOP ada, Column Kanban ada | ✅ Gunakan Column Kanban, metadata dari SOP |
| SOP ada, Column Kanban **tidak ada** | ❌ ABAIKAN step SOP ini |
| SOP **tidak ada**, Column Kanban ada | ✅ TETAP DIHITUNG (gunakan nama column sebagai step) |

Hasil mapping: **Array of audit steps berdasarkan Column Kanban**, dengan enrichment dari SOP jika tersedia.

```json
{
  "audit_steps": [
    {
      "column_id": "uuid",
      "column_name": "PIC, TUJUAN, DAN TGL KUNJUNGAN",
      "column_order": 1,
      "sop_match": true,
      "sop_step_id": "S1",
      "keywords": ["PIC", "tujuan", "tanggal"]
    },
    {
      "column_id": "uuid",
      "column_name": "Cek Absen Kehadiran Shift Pagi",
      "column_order": 2,
      "sop_match": true,
      "sop_step_id": "S2",
      "keywords": ["absen", "shift pagi"]
    }
  ],
  "total_columns": 33,
  "max_score_per_task": 330
}
```

**Skor Maksimal per Task = Jumlah Column Kanban × 10**

---

## Tahap 5: Scoring Evidence per Task

### Ambil Detail Task

```
GET /api/tasks/{task_id}
```

Response berisi `comments[]` — ini sumber evidence utama.

### Logika Deteksi Evidence per Column

Untuk mengetahui apakah suatu column memiliki evidence, periksa **komentar pada task** tersebut. Cara mendeteksi:

1. **Deteksi Column Aktif:** Periksa `activity_log` task untuk mencari history perpindahan column. Jika task saat ini berada di column ke-N, maka column 1..N dianggap sudah dilalui.

2. **Deteksi Komentar per Column:** Cocokkan komentar berdasarkan:
   - **Keyword matching:** Cocokkan `keywords[]` dari audit step dengan isi komentar
   - **Urutan waktu (chronological):** Kelompokkan komentar berdasarkan urutan waktu dan sebarkan ke columns sesuai urutan
   - **Explicit mention:** Jika komentar menyebut nama column/step secara eksplisit

3. **Deteksi Media (Foto/Video):**
   - Cek apakah komentar mengandung URL gambar/video
   - Cek apakah komentar berisi attachment/lampiran
   - Keyword: `http`, `.jpg`, `.png`, `.mp4`, `[image]`, `[foto]`, `[screenshot]`
   - Periksa juga filed `attachments` pada comment jika tersedia

### Tabel Scoring

| Kondisi Evidence | Skor | Deskripsi |
|-----------------|------|-----------|
| **Komentar + Foto/Media** | **10** | Bukti lengkap: ada komentar teks DAN lampiran foto/video/screenshot |
| **Hanya Komentar** | **6** | Ada komentar teks, tapi tanpa bukti foto/media |
| **Tanpa Evidence, tapi step berikutnya ada** | **3** | Column ini kosong, tapi column setelahnya punya evidence (artinya step dilalui tapi tidak didokumentasikan) |
| **Tanpa Evidence sama sekali** | **0** | Tidak ada komentar dan step berikutnya juga kosong |

### Contoh Perhitungan

Task dengan 5 Column Kanban (Max Score = 50):

| Column | Evidence | Skor |
|--------|----------|------|
| Column 1: PIC & Tujuan | Komentar + Foto | 10 |
| Column 2: Cek Absen Pagi | Hanya Komentar | 6 |
| Column 3: Cek Saldo | Kosong (tapi Col 4 ada) | 3 |
| Column 4: Audit Aset | Hanya Komentar | 6 |
| Column 5: Selesai | Komentar + Foto | 10 |
| **TOTAL** | | **35 / 50** |

---

## Tahap 6: Format Output Laporan

### Tabel 1: Detail Per Task (urutkan per assignee)

```
| Nama Task | SPV | Jalur 1 | Jalur 2 | ... | Jalur N | Total | Max |
|-----------|-----|---------|---------|-----|---------|-------|-----|
| OC1, 22 April 2026 | Syafwan Wahyudi | 10 | 6 | ... | 6 | 247 | 330 |
| OC37, 22 April 2026 | Meli Fatimah | 10 | 10 | ... | 6 | 277 | 330 |
```

**Keterangan kolom:**
- **Nama Task:** Judul task
- **SPV:** Nama assignee (orang yang ditugaskan)
- **Jalur 1..N:** Nama column Kanban, isinya adalah skor (10/6/3/0)
- **Total:** Jumlah seluruh skor column
- **Max:** Skor maksimal (jumlah_column × 10)

### Tabel 2: Ringkasan Per Individu

```
| Nama SPV | Jumlah Task | Total Score | Skor Maksimal | Rata-Rata |
|----------|-------------|-------------|---------------|-----------|
| Meli Fatimah | 3 | 831 | 990 | 277.0 |
| Syafwan Wahyudi | 2 | 494 | 660 | 247.0 |
```

**Keterangan:**
- **Total Score:** Penjumlahan skor dari semua task milik individu tersebut
- **Skor Maksimal:** Jumlah task × jumlah column × 10
- **Rata-Rata:** Total Score / Jumlah Task

### Format JSON Individu (untuk programmatic use)

```json
[
  {
    "nama": "Syafwan Wahyudi",
    "posisi": "SPV Area Banjarmasin",
    "jumlah_task": 1,
    "total_score": 247,
    "skor_maksimal": 330,
    "rata_rata": 247.0,
    "breakdown_task": [
      {
        "nama_task": "OC1, 22 April 2026",
        "task_id": "uuid",
        "kolom_saat_ini": "PENGECEKAN TIM PENILAI KPI",
        "total_komentar": 39,
        "skor_total_task": 247,
        "skor_maksimal_task": 330,
        "breakdown_jalur": [
          { "jalur": "PIC, TUJUAN, DAN TGL KUNJUNGAN", "skor": 10, "alasan": "Komentar + Foto" },
          { "jalur": "Cek Absen Kehadiran Shift Pagi", "skor": 6, "alasan": "Hanya Komentar" },
          { "jalur": "Cek Absen Matikan Lampu", "skor": 3, "alasan": "Tanpa evidence, step berikutnya ada" }
        ]
      }
    ]
  }
]
```

---

## Panduan Praktis Eksekusi

### Step-by-Step untuk Agent

```
1. Terima request audit dari user (team_id / team_name)

2. GET /api/teams → cari team_id jika belum ada

3. GET /api/teams/{team_id}/context
   → Cek sop.has_sop
   → Jika false: STOP, laporkan "Belum ada SOP"
   → Simpan: members[], kanbans[], sop.primary_document.id

4. GET /api/documents/{sop_id}
   → Parse konten SOP → JSON steps[]

5. GET /api/teams/{team_id}/kanbans
   → Ambil columns[] (ACUAN UTAMA)
   → Hitung: total_columns, max_score = total_columns × 10

6. Mapping: Cocokkan SOP steps ↔ Kanban Columns
   → Column Kanban yang tidak ada di SOP: TETAP DIHITUNG
   → SOP step yang tidak ada di Column: BUANG

7. GET /api/teams/{team_id}/tasks
   → Untuk setiap task:
     a. GET /api/tasks/{task_id}
     b. Ambil comments[]
     c. Untuk setiap column:
        - Cari komentar yang relevan (keyword/urutan)
        - Tentukan: ada foto? hanya teks? kosong?
        - Beri skor: 10 / 6 / 3 / 0
     d. Jumlahkan skor per task

8. Kelompokkan task per assignee
   → Hitung: total_score, skor_maksimal, rata_rata

9. Generate output:
   → Tabel 1: Detail per task
   → Tabel 2: Ringkasan per individu
   → JSON array untuk programmatic use
```

### Contoh API Call Sequence

```javascript
// 1. Context
const ctx = await fetch('http://localhost:8888/api/teams/{team_id}/context').then(r => r.json());

// 2. Cek SOP
if (!ctx.sop.has_sop) {
  return "⛔ Team belum punya SOP";
}

// 3. Ambil SOP
const sop = await fetch(`http://localhost:8888/api/documents/${ctx.sop.primary_document.id}`).then(r => r.json());

// 4. Ambil Kanban Columns
const kanbans = await fetch(`http://localhost:8888/api/teams/{team_id}/kanbans`).then(r => r.json());
const columns = kanbans.data[0].columns; // Column Kanban = ACUAN UTAMA

// 5. Ambil Tasks
const tasks = await fetch(`http://localhost:8888/api/teams/{team_id}/tasks`).then(r => r.json());

// 6. Detail per task
for (const task of tasks.data) {
  const detail = await fetch(`http://localhost:8888/api/tasks/${task.id}`).then(r => r.json());
  // ... scoring per column ...
}
```

---

## Edge Cases & Error Handling

| Situasi | Penanganan |
|---------|-----------|
| Team tidak punya SOP | ⛔ Stop, laporkan |
| SOP dalam format PDF (non-parseable) | Coba parse dari nama file + column names sebagai guide |
| Task belum punya assignee | Kelompokkan di "UNASSIGNED" |
| Task belum pindah dari column pertama | Hanya column pertama yang dinilai, sisanya skor 0 |
| Komentar tidak bisa dicocokkan ke column | Gunakan urutan kronologis sebagai fallback |
| Column Kanban kosong (0 task) | Column tetap dihitung di max_score |
| Multiple Kanban boards di satu team | Gunakan Kanban pertama (atau tanyakan user) |

---

## Catatan Penting

> [!IMPORTANT]
> **Column Kanban adalah ACUAN UTAMA.** Jika ada perbedaan antara SOP dan Column Kanban, selalu ikuti Column Kanban. SOP berfungsi sebagai enrichment (metadata, keywords) bukan sebagai penentu jumlah step.

> [!TIP]
> **Scoring selalu per Column Kanban.** Max score = jumlah column × 10. Tidak pernah berubah meskipun SOP punya lebih banyak/sedikit step.

> [!NOTE]
> **Laporan selalu dalam Bahasa Indonesia.** Termasuk header tabel, deskripsi, dan rekomendasi.

---

**Version:** 1.0.0  
**Last Updated:** Mon 2026-04-28  
**Maintainer:** System  
**Status:** ✅ Production Ready
