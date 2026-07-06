# 01 — Audit: Posisi Hardcoded & Duplikasi

Dokumen ini inventaris seluruh titik di mana **nama posisi (string) di-hardcode di PHP & TypeScript**, plus duplikasi file frontend, plus data definition yang di-hardcode sebagai PHP array.

## Masalah Utama

`Position` model (`app/Models/Position.php`) saat ini hanya punya:

```php
protected $fillable = ['name', 'description', 'created_by'];
```

Tidak ada kolom semantik apapun yang menjawab pertanyaan:

- Apakah posisi ini perlu daily KPI task? → dicek via `in_array(name, [...])` di banyak tempat
- Apakah manager atau line staff? → dicek via `in_array(name, [...])` di banyak tempat
- Area/region mana? → dicek via `match($positionName === 'Manager HR' => 'hr', ...)` di KpiDashboardController
- Butuh anggota SPV team? → dicek via logika khusus hanya untuk 3 manager positions

## A. Hardcoded Position Lists di PHP Backend

### A.1 — Services (lokasi kritis, dipanggil setiap hari)

| File | Baris | Hardcoded | Peran |
|------|-------|-----------|-------|
| `app/Services/KpiTaskGenerationService.php` | 36-37 | `['Manager HR', 'Manager Operasional']` ∪ `Position::GUDANG_POSITIONS` | Cek is_manager saat generate task |
| `app/Services/KpiScoringService.php` | 26-27 | Sama | Cek is_manager saat scoring |

**Efek**: Kedua service ini dipanggil harian oleh cron `app:kpi-generate-daily-tasks` & `app:kpi-calculate-daily-scores`. Hardcoded arrays harus disinkronkan manual di kedua file — risk inkonsistensi.

### A.2 — Controllers

| File | Baris | Hardcoded | Peran |
|------|-------|-----------|-------|
| `app/Http/Controllers/KpiDashboardController.php` | 51-53 | `match($positionName === 'Manager HR' => 'hr', Position::GUDANG_POSITIONS => 'gudang')` | Map posisi ke area_slug |
| `app/Http/Controllers/KpiDashboardController.php` | 83 | `in_array(['Manager HR', 'Manager Operasional'])` | is_manager flag |
| `app/Http/Controllers/KpiDashboardController.php` | 280 | Sama | is_manager (tugas) |
| `app/Http/Controllers/KpiDashboardController.php` | 303 | `=== 'Manager Gudang'` | Special-cek gudang manager |
| `app/Http/Controllers/KpiDashboardController.php` | 322-324 | `in_array($selectedPosition, Position::GUDANG_POSITIONS)` | Gudang monitoring dropdown logic |
| `app/Http/Controllers/KpiDashboardController.php` | 590-591 | Sama | is_manager |
| `app/Http/Controllers/KpiReportController.php` | 36-37 | Sama dengan KpiDashboardController | Map posisi ke area_slug |
| `app/Http/Controllers/KpiReportController.php` | 45, 193 | `in_array(['Manager HR', 'Manager Operasional', 'Manager Gudang'])` | canSubmitReports() guard |
| `app/Http/Controllers/KpiCeoController.php` | 31 | `$managerPositions = ['Manager HR', 'Manager Operasional', 'Manager Gudang']` | Filter untuk CEO dashboard |
| `app/Http/Controllers/KpiCeoController.php` | 38, 40, 42 | `whereHas('jobPosition', $q->where('name', 'Manager HR/Operasional/Gudang'))` | Score query per area |
| `app/Http/Controllers/KpiCeoController.php` | 73, 77, 81 | `=== 'Manager HR/Operasional/Gudang'` | In-memory filter |
| `app/Http/Controllers/KpiCeoController.php` | 139, 181, 208 | `whereIn(... 3 manager names ...)` | Aggregate queries |
| `app/Http/Controllers/KpiCeoController.php` | 42 | `whereHas(... 'Manager Gudang')` | Gudang-specific |
| `app/Http/Controllers/Api/V1/AgentDailyReportController.php` | 22 | Sama list 3 managers | Public agent API filter |
| `app/Http/Controllers/GudangController.php` | 21 | `array_merge(['Manager Gudang'], Position::GUDANG_LINE_POSITIONS)` | Tambah Manager Gudang untuk admin monitoring |
| `app/Http/Controllers/GudangController.php` | 26 | `!in_array($positionName, Position::GUDANG_POSITIONS)` | Cek isMonitoring mode |

### A.3 — Model constants

| File | Baris | Konten |
|------|-------|--------|
| `app/Models/Position.php` | 15-32 | `GUDANG_POSITIONS` & `GUDANG_LINE_POSITIONS` sebagai const array |

**Total hardcoded position name occurrences**: 30+ di kode PHP.

## B. Duplikasi File Frontend

Untuk setiap area (HR, Operational, Gudang), ada 7 file TSX duplicated:

```
resources/js/pages/
├── hr/kpi/
│   ├── dashboard.tsx
│   ├── daily-detail.tsx
│   ├── weekly-detail.tsx
│   ├── monthly-detail.tsx
│   ├── report-form.tsx
│   ├── reports.tsx
│   └── no-access.tsx
├── operational/kpi/  ← 7 file sama
└── gudang/kpi/        ← 6 file (gudang tidak punya report-form)
```

**Total**: 20 file TSX `hr/operational/gudang/kpi/*`.

Isinya 90%+ identik kecuali:
- Some route prefixes (e.g. `/hr/kpi/dashboard` vs `/operational/kpi/dashboard`)
- Beberapa label Indonesia berbeda ("Rekap Harian HR" vs "Rekap Harian Operasional")

Plus beberapa link generik di komponen bersama juga hardcode semua 3 area:

| File | Hardcoded |
|------|-----------|
| `resources/js/components/kpi/dynamic-reports-list.tsx` | `/${area}/kpi/dashboard` |
| `resources/js/components/app-sidebar.tsx` (line 210) | `/gudang/kpi/dashboard` dll |

## C. Seeders dengan Hardcoded Task Definitions

### C.1 — `database/seeders/KpiTaskDefinitionSeeder.php`

- ~340 baris PHP
- 34 tasks Manager Operasional sebagai `$managerOpsTasks` array
- 16 tasks Manager HR sebagai `$managerHRTasks` array
- Total bobot harus 100 (masih dicek manual)

### C.2 — `database/seeders/KpiGudangKurirSeeder.php`

- ~875 baris PHP
- 50+ task definitions sebagai array untuk 6 posisi gudang
- 6 Position::firstOrCreate() calls
- 6 PositionPermission::firstOrCreate() calls
- Method helper `formatWorkMethod()` & `formatVerification()` mengumpulkan HTML inline

**Total**: ~1200 baris PHP yang berisi data lebih baik di CSV/JSON.

### C.3 — Yang SUDAH dinamis (referensi bagus)

`database/seeders/PositionReportFieldSeeder.php` sudah menunjukkan pattern yang benar:
- Data definition di kode PHP tapi fetched dari array asosiatif yang clear
- Lebih lanjut ke versi ideal: data di CSV/JSON + Artisan command importer

## D. Pain Points Konkret

Misalkan besok HR mau tambah posisi baru **"Finance Manager"** yang:

- Punya 18 KPI task definitions (bobot total = 100)
- Punya area route `/finance/kpi/*`
- Generate daily task otomatis
- Submit daily report dengan field template

State quo → butuh edit di:

1. ✏️ `app/Models/Position.php` — tambah const baru? atau hardcode di `in_array` di 9 file?
2. ✏️ `app/Http/Controllers/KpiDashboardController.php` line 51 — tambah `match` baru
3. ✏️ `app/Http/Controllers/KpiReportController.php` — tambah `match` baru
4. ✏️ `app/Http/Controllers/KpiCeoController.php` — tambah beberapa `whereHas` baru (3-4 lokasi)
5. ✏️ `app/Http/Controllers/Api/V1/AgentDailyReportController.php` — tambah ke `$managerPositions`
6. ✏️ `routes/web.php` — tambah route group baru
7. ✨ Buat 7 file TSX baru di `resources/js/pages/finance/kpi/*`
8. ✨ Copy-paste logic dari `KpiDashboardController` untuk monitoring mode (kalau gudang-styled)
9. ✨ Buat seeder baru (atau tambah ke `KpiGudangKurirSeeder`)
10. ✨ Update tests yang hardcode 3 manager names

**Total sentuh**: ~10 file, termasuk 7 file TSX baru.

Setelah refactor plan ini → hanya:

1. INSERT ke `positions`: `(name='Finance Manager', has_kpi=true, is_manager=true, area_slug='finance', requires_spv_team=false)`
2. INSERT task definitions via admin UI atau CSV import
3. **SELESAI**

## E. Hidden Complexity

### E.1 — Gudang Monitoring Mode (`KpiDashboardController::gudangMonitoring()` lines 218-321)

Ini method khusus yang:
- Dipanggil kalau admin tanpa posisi gudang akses `/gudang/*`
- Tampilkan dropdown `gudangUsers` dari `Position::GUDANG_LINE_POSITIONS` (5 line, exclude Manager Gudang)
- Hardcoded special-case yang harus tetap di-handle setelah refactor

### E.2 — Route Collision Risk

Kalau di Phase 2 pakai `{area}/kpi/*` generic prefix, bisa collision dengan route existing `gudang/index` (bukan KPI). Solusi: gunakan `whereIn('area', [...valid areas...])` constraint dengan area list di-cache atau di-query dari DB.

### E.3 — Tests Hardcoded

Multiple test files hardcode list 3 manager positions:

- `tests/Feature/GudangKpiTest.php`
- `tests/Feature/KpiCeoDashboardTest.php`
- `tests/Feature/AgentDailyReportApiTest.php`
- `tests/Feature/DynamicReportTemplateTest.php`

Setelah refactor, tests boleh tetap (data tidak berubah) atau boleh di-update pakai `Position::managers()` query untuk lebih akurat.

## F. Estimasi Total Tech Debt

| Kategori | Hardcoded Count | Effort Refactor |
|----------|----------------|-----------------|
| PHP backend services | 2 file | 30 menit |
| PHP backend controllers | 6 file | 3-4 jam |
| PHP model constants | 1 file | 15 menit |
| Frontend TSX duplikat | 20 file | 4-6 jam |
| Seeder PHP arrays | 2 file ~1200 baris | 2-3 jam (kalau jadi CSV) |
| Tests | 4 file | 1 jam (opsional) |
| **Total** | **35 file** | **~12-18 jam** |

Lanjut ke [02-architecture.md](./02-architecture.md) untuk desain targetnya.
