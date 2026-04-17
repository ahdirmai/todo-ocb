# Activity Log Feature

Mencatat dan menampilkan semua aktivitas yang terjadi dalam aplikasi — mulai dari perubahan task, komentar, penambahan anggota tim, hingga aksi admin.

## Lingkup Aktivitas yang Dicatat

| Kategori | Aksi |
|---|---|
| **Task** | Dibuat, diperbarui (judul, deskripsi, due date, kolom), dihapus, dipindah kolom, tag ditambah/dihapus, lampiran diupload |
| **Komentar** | Ditambahkan, dihapus |
| **Tim** | Dibuat, direname, diarsipkan, dipulihkan |
| **Anggota Tim** | Ditambahkan ke tim, dikeluarkan dari tim |
| **Member** | Diundang/dibuat, role diubah, dihapus |
| **Kanban** | Kolom dibuat, diubah, dihapus, urutan diubah |
| **Auth** | Login, logout (opsional) |

---

## Arsitektur

### Custom Activity Log (tanpa package tambahan)
Menggunakan tabel `activity_logs` sendiri agar lebih fleksibel dan tidak menambah dependency baru.

```
subject_type + subject_id → entitas yang diubah (polymorphic)
causer_type + causer_id   → siapa yang melakukan (polymorphic, biasanya User)
event                     → nama aksi (task.created, task.moved, dll.)
description               → teks human-readable
properties                → JSON: data sebelum dan sesudah (old/new)
team_id                   → untuk filter log per tim
```

---

## Proposed Changes

### 1. Database

#### Migration: `create_activity_logs_table`
```
- id (uuid)
- log_name (string, nullable) — kategori: task, comment, team, member, auth
- description (string)
- subject_type / subject_id — model yang diubah (morphs)
- event (string, nullable) — e.g. created, updated, deleted
- causer_type / causer_id — user yang melakukan (morphs)
- properties (json, nullable) — {old: {...}, attributes: {...}}
- team_id (FK ke teams, nullable) — untuk filter per tim
- created_at / updated_at
```

---

### 2. Backend

#### [NEW] `app/Models/ActivityLog.php`
Model Eloquent untuk `activity_logs`.
- `scopeForTeam($teamId)` — filter per tim
- `scopeByEvent($event)` — filter by event
- Relasi: `subject()` (morphTo), `causer()` (morphTo)

#### [NEW] `app/Services/ActivityLogger.php`
Service class yang dipanggil dari controller/observer:
```php
ActivityLogger::log(
    event: 'task.moved',
    subject: $task,
    description: "Task dipindah ke kolom '{$newColumn->name}'",
    properties: ['old' => ['column' => $old], 'new' => ['column' => $new]],
    teamId: $task->team_id
);
```

#### [NEW] Observers
- `app/Observers/TaskObserver.php` — created, updated, deleted
- `app/Observers/CommentObserver.php` — created, deleted
- `app/Observers/TeamObserver.php` — created, updated, deleted

#### [MODIFY] Controllers
Tambahkan `ActivityLogger::log()` untuk aksi yang tidak tertangkap observer:
- `TaskController` — pindah kolom, sync tag, upload lampiran
- `TeamMemberController` — store, destroy
- `MemberController` — store, update, destroy
- `KanbanColumnController` — store, update, destroy

#### [NEW] `app/Http/Controllers/ActivityLogController.php`
- `index()` — log untuk tim tertentu atau global (superadmin)

---

### 3. Frontend

#### [NEW] `resources/js/pages/teams/activity-tab.tsx`
Tab "Aktivitas" di halaman tim (`/teams/{slug}/activity`):
- Timeline vertikal bergaya feed
- Avatar user, deskripsi aksi, waktu relatif ("2 jam lalu")
- Badge warna per kategori (task = biru, member = hijau, dll.)
- Filter: All / Task / Komentar / Anggota
- Infinite scroll / load more

#### [MODIFY] `routes/web.php`
Tambah route tab `activity` di `teams.show` dan route `ActivityLogController`.

#### [MODIFY] `app/Http/Controllers/TeamController.php`
Handle tab `activity` di method `show()`.

---

## Alur Data

```
User action (controller)
    ↓
ActivityLogger::log() atau Observer
    ↓
activity_logs table
    ↓
ActivityLogController@index
    ↓
activity-tab.tsx (Timeline UI)
```

---

## Open Questions

1. **Log auth (login/logout)?** — Membutuhkan listener `Illuminate\Auth\Events`, tidak terkait tim spesifik.
2. **Halaman global `/admin/activity` untuk superadmin?** — Jika ya, perlu halaman terpisah lintas tim.

---

## Verification Plan

```bash
php artisan make:test ActivityLogTest --pest
php artisan test --compact --filter=ActivityLog
```

Test cases:
- Membuat task → log `task.created` terbuat
- Memindah task ke kolom lain → log `task.moved` dengan properties yang benar
- Menghapus anggota tim → log `member.removed` terbuat
- Filter log per tim berjalan benar
