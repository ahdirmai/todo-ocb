# 02 — Target Architecture

Dokumen ini menjelaskan desain target untuk sistem KPI yang fully data-driven.

## Prinsip Desain

1. **Single Source of Truth**: Tabel `positions` menjadi satu-satunya sumber untuk semua pertanyaan tentang "apakah posisi ini perlu KPI?"
2. **Convention Over Configuration**: Pakai boolean flags + scope string, bukan JSON config blob.
3. **Backward Compatible**: Kolom baru default ke nilai aman (`false`/`null`) supaya posisi existing tidak rusak sebelum datanya di-update manual.
4. **Incremental Rollout**: Bisa implementasi per phase tanpa big-bang release.

## Perubahan Skema DB

### Tabel `positions` — tambah 4 kolom

```sql
-- Migration: add_kpi_metadata_to_positions_table
ALTER TABLE positions
    ADD COLUMN has_kpi BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN is_manager BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN area_slug VARCHAR(64) NULL,
    ADD COLUMN requires_spv_team BOOLEAN NOT NULL DEFAULT TRUE;

-- Index untuk query rapid
CREATE INDEX positions_has_kpi_idx ON positions(has_kpi) WHERE has_kpi = TRUE;
CREATE INDEX positions_area_slug_idx ON positions(area_slug) WHERE area_slug IS NOT NULL;
```

### Data-fill existing rows

```php
// Di migration up() setelah ALTER TABLE
DB::table('positions')->where('name', 'Manager HR')->update([
    'has_kpi' => true, 'is_manager' => true, 'area_slug' => 'hr', 'requires_spv_team' => false,
]);
DB::table('positions')->where('name', 'Manager Operasional')->update([
    'has_kpi' => true, 'is_manager' => true, 'area_slug' => 'operational', 'requires_spv_team' => false,
]);
DB::table('positions')->where('name', 'Manager Gudang')->update([
    'has_kpi' => true, 'is_manager' => true, 'area_slug' => 'gudang', 'requires_spv_team' => false,
]);
DB::table('positions')->whereIn('name', ['Gudang BJB', 'Gudang BJM', 'Gudang Gesekan', 'Gudang ACC', 'Kurir'])
    ->update(['has_kpi' => true, 'is_manager' => false, 'area_slug' => 'gudang', 'requires_spv_team' => false]);
```

## Model `Position` Baru

### Scopes

```php
// app/Models/Position.php

public function scopeKpiEnabled(Builder $query): Builder
{
    return $query->where('has_kpi', true);
}

public function scopeManagers(Builder $query): Builder
{
    return $query->where('is_manager', true);
}

public function scopeArea(Builder $query, string $slug): Builder
{
    return $query->where('area_slug', $slug);
}

public function scopeLineStaff(Builder $query, ?string $areaSlug = null): Builder
{
    $q = $query->where('is_manager', false);
    if ($areaSlug !== null) {
        $q->where('area_slug', $areaSlug);
    }
    return $q;
}
```

### Accessors

```php
public function getAreaSlugOrDefaultAttribute(): string
{
    return $this->area_slug ?? 'operational'; // fallback aman
}

public function getRequiresSpvTeamAttribute(): bool
{
    return (bool) $this->requires_spv_team;
}
```

### Casts update

```php
protected $casts = [
    'has_kpi' => 'boolean',
    'is_manager' => 'boolean',
    'requires_spv_team' => 'boolean',
];
```

## Generic Area Resolution

### Pattern Baru (single line vs old 5-line match)

**Before** (`KpiDashboardController::getPositionArea()`):
```php
$expectedArea = match (true) {
    $positionName === 'Manager HR' => 'hr',
    $positionName === 'Manager Operasional' => 'operational',
    in_array($positionName, Position::GUDANG_POSITIONS) => 'gudang',
    default => throw new \Exception('Position tidak memiliki akses KPI'),
};
```

**After**:
```php
$expectedArea = $user->jobPosition?->area_slug;

if (! $user->jobPosition?->has_kpi || ! $expectedArea) {
    abort(403, 'Posisi Anda tidak memiliki akses KPI');
}

if ($urlArea && $urlArea !== $expectedArea) {
    abort(403, "Akses ditolak. Area Anda: {$expectedArea}");
}

return $expectedArea;
```

## Service Layer Refactor Pattern

### Pattern Seragam untuk Replace `in_array([...])`

**Before** (di Service & Controller):
```php
$positionName = $user->jobPosition?->name;
$isManager = in_array($positionName, ['Manager HR', 'Manager Operasional'])
    || in_array($positionName, Position::GUDANG_POSITIONS);
```

**After**:
```php
$isManager = (bool) $user->jobPosition?->is_manager;
```

### Pattern untuk `whereHas('jobPosition', $q->whereIn('name', [...]))`

**Before** (di `KpiCeoController.php` lines 38-42):
```php
$scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager HR'));
$scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Operasional'));
$scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Gudang'));
```

**After**:
```php
$positionFilter = $request->input('position', 'all'); // 'hr'|'operational'|'gudang'
$scoreQuery->whereHas('user.jobPosition', fn ($q) => $q->managers()->area($positionFilter));
```

## File Structure Target

### Backend

```
app/
├── Models/
│   └── Position.php                          # tambah scopes + casts
├── Services/
│   ├── KpiTaskGenerationService.php          # refactor: pakai $user->jobPosition?->is_manager
│   └── KpiScoringService.php                 # refactor: sama
├── Http/Controllers/
│   ├── KpiDashboardController.php            # generic area_resolution + monitoring
│   ├── KpiReportController.php               # generic area + is_manager guard
│   ├── KpiCeoController.php                  # pakai Position::managers()->area()
│   ├── KpiAdminController.php                # unchanged (sudah generic via DB)
│   ├── GudangController.php                  # refactor: pakai scopes
│   ├── PositionController.php                # tambah validasi has_kpi
│   └── Api/V1/AgentDailyReportController.php # pakai Position::managers()->whereHas('users')
└── Console/Commands/
    ├── GenerateDailyKpiTasks.php             # generate untuk semua has_kpi=true positions
    └── KpiImportDefinitions.php (BARU)       # Phase 4: CSV/JSON importer
```

### Frontend (Phase 3)

```
resources/js/pages/Kpi/                     # dari 20 file jadi 7 file
├── Dashboard.tsx                           # generic, terima areaSlug prop
├── DailyDetail.tsx
├── WeeklyDetail.tsx
├── MonthlyDetail.tsx
├── ReportForm.tsx
├── ReportsList.tsx
└── NoAccess.tsx

# Existing (tetap, mungkin sedikit refactor)
resources/js/pages/
├── hr/index.tsx                             # tetap (HR area landing)
├── operational/index.tsx                     # tetap
├── gudang/index.tsx                          # tetap, monitoring mode handled by controller
├── kpi/
│   ├── admin/definitions.tsx                 # tambah CSV import modal
│   └── admin/scores.tsx
└── positions/index.tsx                       # tambah UI toggle has_kpi/is_manager/area_slug
```

## Tambah Posisi Baru — UX Flow

Setelah semua phase complete, admin mau tambah "Finance Manager":

1. **Buka** `/positions` → klik "Tambah Posisi"
   - Isi: name `Finance Manager`, description `Mengelola finance & accounting`
   - Toggle: `has_kpi = ON`, `is_manager = ON`, `requires_spv_team = OFF`
   - Pilih: `area_slug = finance`
2. **Buka** `/kpi/admin/definitions`
   - Pilih posisi `Finance Manager`
   - Import CSV `finance_kpi.csv` atau tambah manual via existing form
3. **Selesai**. Otomatis:
   - Route `/finance/kpi/dashboard` tersedia
   - Generate daily task harian dari definitions
   - Score harian terhitung
   - Report field template configurable (via Phase 4)

**Zero new files**.

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Tambah kolom di `positions` (chosen) | Native Eloquent, simple query, cepat | Table sedikit lebih lebar |
| Bikin pivot table `position_kpi_config` | Separation lebih clean | Extra join, migration lebih kompleks |
| Setiap- fitur flag-field config (JSON) | Single column super flexible | Hard to query, no Eloquent scope, magic |
| Stored procedure untuk logic | Push logic ke DB | Postgres/MySQL specific, harder to test |

**Decision**: Tambah kolom langsung. Paling idiomatic Laravel, paling simple, paling aligned dengan codebase yang sudah ada (lihat `Position::GUDANG_POSITIONS` const sebagai precedent).

Lanjut ke [03-phase-1.md](./03-phase-1.md) untuk implementasi konkret.
