# 07 — Rollback & Validation

Dokumen ini menguraikan strategi backward compatibility, test plan, acceptance criteria per phase, dan risk register.

## Strategi Backward Compatibility

### Prinsip

> Setiap phase harus **non-breaking** — posisi existing tetap bekerja tanpa intervensi manual.

Mekanisme:

1. **Kolom baru punya `default(false)`/`null`** → posisi existing tidak punya metadata secara otomatis, tapi tidak crash.
2. **Migration `up()` sekaligus `fillKpiMetadata()`** → existing rows otomatis di-update dengan nilai yang benar.
3. **`scopeKpiEnabled()` return false by default** untuk row tanpa flag set, jadi area baru ter-expose hanya setelah eksplisit di-tag.

### Backup Plan

Sebelum setiap phase migration:

```bash
# Backup DB sebelum migration
mysqldump -u root -p todo_app_v2 > storage/backups/before_phase_$(date +%Y%m%d_%H%M%S).sql
```

Atau via Laravel:

```bash
# Backup tables affected
php artisan db:backup --tables=positions,kpi_task_definitions
```

(Asumsi package `spatie/laravel-backup` atau manual mysqldump.)

### Rollback Procedure per Phase

#### Phase 1 Rollback

```bash
# 1. Rollback migration
php artisan migrate:rollback --step=1

# 2. Verify constants GUDANG_POSITIONS masih ada
grep -n "GUDANG_POSITIONS" app/Models/Position.php

# 3. Restore refactored files dari git
git checkout HEAD -- app/Services/KpiTaskGenerationService.php
git checkout HEAD -- app/Services/KpiScoringService.php
git checkout HEAD -- app/Http/Controllers/KpiDashboardController.php
git checkout HEAD -- app/Http/Controllers/KpiReportController.php
git checkout HEAD -- app/Http/Controllers/KpiCeoController.php
git checkout HEAD -- app/Http/Controllers/Api/V1/AgentDailyReportController.php
git checkout HEAD -- app/Http/Controllers/GudangController.php

# 4. Run tests
php artisan test --filter="GudangKpi|KpiCeoDashboard"
```

#### Phase 2 Rollback

```bash
# Generic routes
git checkout HEAD -- routes/web.php
php artisan route:clear
```

#### Phase 3 Rollback

```bash
# Restore TSX files
git checkout HEAD -- resources/js/pages/{hr,operational,gudang}/kpi/

# Restore controller render paths
git checkout HEAD -- app/Http/Controllers/KpiDashboardController.php
git checkout HEAD -- app/Http/Controllers/KpiReportController.php
```

#### Phase 4 Rollback

```bash
# Restore seeders
git checkout HEAD -- database/seeders/KpiTaskDefinitionSeeder.php
git checkout HEAD -- database/seeders/KpiGudangKurirSeeder.php

# DB cleanup kalau sempat di-import
php artisan tinker --execute='KpiTaskDefinition::where("imported_at", ">", now()->subHour())->delete();'
```

## Test Plan

### Unit Tests

```php
// tests/Feature/KpiPositionMetadataTest.php (NEW)

it('Manager HR adalah manager + has_kpi + area_slug hr', function () {
    $pos = Position::where('name', 'Manager HR')->first();
    expect($pos->is_manager)->toBeTrue();
    expect($pos->has_kpi)->toBeTrue();
    expect($pos->area_slug)->toBe('hr');
    expect($pos->requires_spv_team)->toBeFalse();
});

it('Gudang BJB adalah line staff dengan area gudang', function () {
    $pos = Position::where('name', 'Gudang BJB')->first();
    expect($pos->is_manager)->toBeFalse();
    expect($pos->has_kpi)->toBeTrue();
    expect($pos->area_slug)->toBe('gudang');
});

it('scopeKpiEnabled return hanya posisi dengan has_kpi=true', function () {
    $enabled = Position::kpiEnabled()->pluck('name')->all();
    expect($enabled)->toContain('Manager HR', 'Manager Operasional', 'Manager Gudang', 'Gudang BJB');
});

it('scopeManagers return hanya manager positions', function () {
    $managers = Position::managers()->pluck('name')->all();
    expect($managers)->toContain('Manager HR', 'Manager Operasional', 'Manager Gudang');
    expect($managers)->not->toContain('Gudang BJB', 'Kurir');
});

it('scopeArea filter by area_slug', function () {
    expect(Position::area('gudang')->pluck('name'))->toContain('Manager Gudang', 'Gudang BJB');
    expect(Position::area('hr')->pluck('name'))->toContain('Manager HR');
});
```

### Integration Tests (Existing — Should Still Pass)

```bash
php artisan test tests/Feature/GudangKpiTest.php
php artisan test tests/Feature/KpiCeoDashboardTest.php
php artisan test tests/Feature/AgentDailyReportApiTest.php
php artisan test tests/Feature/DynamicReportTemplateTest.php
php artisan test tests/Feature/DashboardTest.php
```

Pastikan semua pass TANPA perubahan. Ini memvalidasi backward compat.

### Feature Tests (Regressions)

Tambah beberapa test untuk behaviour baru:

```php
// tests/Feature/PositionMetadataTest.php (NEW addition)

it('user finance manager (dummy) dengan has_kpi=true bisa akses /finance/kpi/dashboard', function () {
    // Create dummy position dengan has_kpi=true, area_slug='finance'
    $position = Position::create([
        'name' => 'Finance Manager Test',
        'has_kpi' => true,
        'is_manager' => true,
        'area_slug' => 'finance',
        'requires_spv_team' => false,
    ]);
    $user = User::factory()->create(['position_id' => $position->id]);

    $this->actingAs($user)
        ->get('/finance/kpi/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Kpi/Dashboard')
            ->where('selectedDate', now()->toDateString())
        );
});

it('admin bisa import CSV via /kpi/admin/definitions/import', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    Storage::fake('local');
    $csv = "Manager HR,99,Test Cat,Test Task,<p>work</p>,<ul><li>verif</li></ul>,5.00";
    $file = UploadedFile::fake()->createWithContent('test.csv', $csv);

    $this->actingAs($admin)->post('/kpi/admin/definitions/import', [
        'file' => $file,
    ])->assertRedirect();

    expect(KpiTaskDefinition::where('task_name', 'Test Task')->exists())->toBeTrue();
});
```

## Acceptance Criteria per Phase

### Phase 1 Done When...

- [ ] Migration `add_kpi_metadata_to_positions_table` applied
- [ ] 9 titik refactor selesai (services + controllers)
- [ ] Tests existing pass tanpa perubahan
- [ ] Manual smoke test: bisa generate task untuk Manager HR/Gudang via cron
- [ ] `grep -rn "Manager HR\|Manager Operasional" app/ | grep -v test` returns 0 (atau hanya definisi constant|literal)

### Phase 2 Done When...

- [ ] Generic route `{area}/kpi/*` registered di `routes/web.php`
- [ ] ValidAreasResolver::all() return area_slug valid & cache bekerja
- [ ] Backward-compat 301 redirect untuk `/hr/kpi/*` (kalau dipake)
- [ ] Tests routes updated
- [ ] `php artisan route:list --name=kpi` shows generic named routes

### Phase 3 Done When...

- [ ] 7 file `Kpi/*` created
- [ ] 13 file `hr/operational/gudang/kpi/*` lama dihapus
- [ ] `KpiDashboardController::index()` render `Kpi/Dashboard` dst
- [ ] `/hr/kpi/dashboard`, `/operational/kpi/dashboard`, `/gudang/kpi/dashboard` semua render sama
- [ ] Sidebar & navigation links pakai generated URLs

### Phase 4 Done When...

- [ ] `database/data/kpi_task_definitions.csv` created dari existing seeders
- [ ] `php artisan kpi:import-definitions` works (with --dry-run & --position)
- [ ] Admin UI bulk import modal wired up di `/kpi/admin/definitions`
- [ ] `KpiTaskDefinitionSeeder.php` refactored pakai command
- [ ] Test upload CSV + import + see task appear

## Validation End-to-End

Setelah semua phase done, validasi akhir:

### Skenario 1: Tambah Posisi Baru (The Ultimate Test)

```bash
# Setup
php artisan tinker --execute='
$pos = \App\Models\Position::create([
    "name" => "Finance Manager",
    "description" => "Mengelola finance & accounting",
    "has_kpi" => true,
    "is_manager" => true,
    "area_slug" => "finance",
    "requires_spv_team" => false,
]);
echo "Created position: " . $pos->name . " (id=" . $pos->id . ")\n";
'

# Add task via admin UI or CSV
echo "position_name,sequence_order,category,task_name,work_method,verification_method,weight
Finance Manager,1,Keuangan,Cek Saldo Harian,<p>...</p>,<ul><li>...</li></ul>,15.00" > /tmp/finance_kpi.csv
php artisan kpi:import-definitions /tmp/finance_kpi.csv

# Verify
php artisan tinker --execute='
$pos = \App\Models\Position::where("name", "Finance Manager")->first();
$tasks = $pos->kpiDefinitions()->count();
echo "Tasks: " . $tasks . "\n";
'

# Verify route accessible (kalau Phase 2 selesai)
php artisan route:list | grep "finance/kpi"

# Generate task harian untuk user Finance Manager
php artisan app:kpi-generate-daily-tasks
```

**Pass criteria**: finance/kpi/dashboard available, KPI task muncul, scoring berhasil.

### Skenario 2: Backward Compatibility

```bash
# Existing flow: User Gudang BJB login → akses dashboard → generate task
# Test: tidak ada perubahan behaviour

php artisan test tests/Feature/GudangKpiTest.php
```

**Pass criteria**: semua tests existing pass.

### Skenario 3: Cache Invalidation (Phase 2)

```bash
# Tambah posisi baru, verify cache refresh otomatis
php artisan tinker --execute='\App\Support\Kpi\ValidAreasResolver::all();'
# Tambah via UI/tinker
php artisan tinker --execute='Position::create(["name"=>"Test","area_slug"=>"test","has_kpi"=>true])'
php artisan tinker --execute='\App\Support\Kpi\ValidAreasResolver::all();'
# Expected: "test" muncul
```

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Migration gagal di tengah | High | Low | Backup DB sebelum migrate; transaction safety |
| Refactor breaking existing flow | High | Medium | Backward compat tests; incremental rollout |
| Cache miss producing empty area list | Medium | Low | Default fallback ke hardcoded list |
| Route name lebih generic = kolisi | Medium | Low | Unique prefix `kpi.area.*` |
| CSV import dengan format salah | Low | Medium | Validasi + preview + dry-run mode |
| Generic dashboard kehilangan per-area logic | Medium | Medium | Increment refactor per-area |
| Frontend tests tidak punya `<KpiDashboard>` coverage | Medium | Medium | Bikin smoke test untuk `/kpi/dashboard` per area |

## Monitoring Setelah Deploy

Setelah deploy ke production:

1. **Watch error logs** untuk 24-48 jam pertama — case khusus mungkin gagal
2. **Monitor Performance** — tambah 1 partial index + scope query harus tetap cepat
3. **User Feedback** — admin yang akses Sidebar/Dashboard, pastikan tidak ada broken link
4. **Test Coverage** — jalankan full test suite sebelum setiap release:
   ```bash
   php artisan test --compact
   ```

## Done Definition

Plan ini selesai ketika:

- ✅ 4 phase implemented dalam PR terpisah (atau 1 PR besar)
- ✅ CHANGELOG + README updated dengan section "Dynamic KPI Position"
- ✅ Semua existing tests pass tanpa perubahan
- ✅ Manual test Skenario 1 (tambah posisi baru via DB saja tanpa code edit) berhasil
- ✅ Code metrics improved: file TSX turun dari 20 ke 7, hardcoded strings turun dari 30+ ke 0

---

Kembali ke [README.md](./README.md) untuk overview.
