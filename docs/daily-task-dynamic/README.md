# Daily Task Dynamic — Plan Refactor

> **Tujuan:** Menjadikan sistem daily KPI task 100% data-driven sehingga menambahkan posisi baru (mis. "Finance Manager", "Marketing Staff") **tidak butuh lagi** membuat file PHP/TSX baru — cukup insert row di DB.

## Konteks

Saat ini, untuk setiap posisi baru yang memerlukan daily KPI task, kita harus:

1. Hardcode nama posisi di 9 file PHP (services + controllers) — `in_array($name, ['Manager HR', ...])`
2. Hardcode `area_slug` di `KpiDashboardController::getPositionArea()` (match statement)
3. Copy-paste 7 file TSX dari area existing (Dashboard, DailyDetail, WeeklyDetail, MonthlyDetail, ReportForm, Reports, NoAccess)
4. Buat seeder PHP baru berisi task-task definition sebagai array (~875 baris untuk gudang)
5. Tambah route prefix baru di `routes/web.php`

Plan ini menguraikan refactor bertahap sehingga kelima langkah di atas **hilang** atau otomatis tergenerasi.

## Daftar Isi

| # | Dokumen | Fokus |
|---|---------|-------|
| 01 | [Audit — Posisi Hardcoded Saat Ini](./01-audit.md) | Inventaris lengkap titik duplikasi (30+) |
| 02 | [Target Architecture](./02-architecture.md) | Desain baru: kolom metadata + scopes + struktur file |
| 03 | [Phase 1 — DB + Services](./03-phase-1.md) | Migrasi konkret + 9 titik refactor service/controller |
| 04 | [Phase 2 — Route Generalization](./04-phase-2.md) | `{area}` parameter + middleware validasi |
| 05 | [Phase 3 — Frontend Consolidation](./05-phase-3.md) | Konsolidasi 21 file TSX jadi 7 file generik |
| 06 | [Phase 4 — Data Import](./06-phase-4.md) | Artisan command + CSV/JSON + admin UI bulk import |
| 07 | [Rollback & Validation](./07-rollback-validation.md) | Backward compat, test plan, acceptance criteria, risk register |

## Executive Summary

**Root issue**: `Position` model cuma punya `name`, `description`, `created_by` — tanpa metadata semantik yang bisa menjawab pertanyaan seperti *"apakah posisi ini perlu KPI?"* atau *"area apa?"*. Akibatnya, semua hal tersebut di-hardcode ke PHP & TSX string arrays di banyak file.

**Solution**: Tambah 4 kolom metadata ke tabel `positions`:

| Kolom | Tipe | Default | Fungsi |
|-------|------|---------|--------|
| `has_kpi` | boolean | `false` | Gate akses ke `/area/kpi/*` |
| `is_manager` | boolean | `false` | Ganti semua `in_array(['Manager HR', 'Manager Operasional', ...])` |
| `area_slug` | string NULL | `null` | Route prefix generik (`hr`, `operational`, `gudang`, dst.) |
| `requires_spv_team` | boolean | `true` | Hapus special-case manager/gudang tanpa SPV team |

Ditambah 3 Eloquent scope di `Position` model + 2 accessor.

**Effort Total**: ~12–18 jam (tergantung kecepatan review). Bisa dipecah jadi 4 phase incremental.

## Quick Start

Untuk yang baru baca dokumen ini:

1. **Mulai dari** [01-audit.md](./01-audit.md) — pahami masalahnya.
2. **Lanjut ke** [02-architecture.md](./02-architecture.md) — pahami desain target.
3. **Implementasikan** [03-phase-1.md](./03-phase-1.md) — ini deliverable tertinggi (80% nilai).
4. Phase 2-4 opsional, tergantung roadmap.

## Timeline & Priority

| Phase | Effort | Risk | Value | Recommended Order |
|-------|--------|------|-------|--------------------|
| 1 (DB + Services)       | 2-3 jam  | Low    | 80% | 🥇 **Start here** |
| 2 (Routes)              | 1-2 jam  | Medium | +10% | 🥈 Setelah Phase 1 stabil |
| 3 (Frontend)            | 4-6 jam  | Medium | +7%  | 🥉 Setelah Phase 2 |
| 4 (CSV Import)          | 2-3 jam  | Low    | +3%  | 🏅 Polish |

Phase 1 saja sudah menjawab pertanyaan "*tidak perlu bikin file baru untuk posisi baru*".

## Risiko Rendah, Bukan Refactor Besar-besaran

- Phase 1 **non-breaking**: kolom baru `default(false)` artinya posisi existing otomatis tetap aman sampai di-migrate manual.
- Tidak ada perubahan UI publik — user-facing tetap sama persis.
- Tests existing tetap valid (data posisi tidak berubah, hanya metadata tambahan).

## Siapa Bertanggung Jawab

- **Backend Lead** — Phase 1 + 2 (migration, services, controllers, routes)
- **Frontend Lead** — Phase 3 (TSX consolidation + shared props)
- **DevOps/QA** — Phase 4 (Artisan command, admin UI, validation tests)

## Definisi Sukses

Setelah semua phase selesai:

- ✅ Tambah posisi "Finance Manager" → cukup insert 1 row `positions` (dengan `has_kpi=true, is_manager=true, area_slug='finance'`) + insert task definitions via admin UI.
- ✅ Otomatis muncul:
  - Route `/finance/kpi/dashboard` (kalau route prefix generic diaktifkan di Phase 2)
  - Halaman dashboard menggunakan template generik (Phase 3)
  - Task dengan evidence flow standar (sudah otomatis)
- ✅ Tidak ada file PHP/TSX baru.
- ✅ Audit log menunjukkan 30+ hardcoded string array hilang (cek via `grep -r "Manager HR" app/ resources/`).

## Catatan untuk Agent/Coder Berikutnya

- Selalu mulai dengan **membaca 01-audit.md** untuk konteks lengkap.
- Setiap phase ada acceptance criteria-nya di [07-rollback-validation.md](./07-rollback-validation.md).
- Kalau bingung, balik ke [02-architecture.md](./02-architecture.md) untuk jelasin "kenapa".
