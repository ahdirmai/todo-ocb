# 03 — Phase 1: DB + Services Refactor

**Effort**: 2-3 jam | **Risk**: Low | **Value**: 80% — phase dengan impact tertinggi.

## Tujuan

Ganti semua hardcoded position lists dengan query ke kolom metadata baru di tabel `positions`.

## Langkah-Langkah

### 1.1 — Buat Migration

```bash
php artisan make:migration add_kpi_metadata_to_positions_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->boolean('has_kpi')->default(false)->after('description');
            $table->boolean('is_manager')->default(false)->after('has_kpi');
            $table->string('area_slug', 64)->nullable()->after('is_manager');
            $table->boolean('requires_spv_team')->default(true)->after('area_slug');

            // Partial index untuk rapid query
            $table->index('has_kpi');
            $table->index('area_slug');
        });

        // Data-fill existing positions
        $this->fillKpiMetadata();
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropIndex(['has_kpi']);
            $table->dropIndex(['area_slug']);
            $table->dropColumn(['has_kpi', 'is_manager', 'area_slug', 'requires_spv_team']);
        });
    }

    private function fillKpiMetadata(): void
    {
        DB::table('positions')->where('name', 'Manager HR')->update([
            'has_kpi' => true, 'is_manager' => true,
            'area_slug' => 'hr', 'requires_spv_team' => false,
        ]);
        DB::table('positions')->where('name', 'Manager Operasional')->update([
            'has_kpi' => true, 'is_manager' => true,
            'area_slug' => 'operational', 'requires_spv_team' => false,
        ]);
        DB::table('positions')->where('name', 'Manager Gudang')->update([
            'has_kpi' => true, 'is_manager' => true,
            'area_slug' => 'gudang', 'requires_spv_team' => false,
        ]);
        DB::table('positions')->whereIn('name', [
            'Gudang BJB', 'Gudang BJM', 'Gudang Gesekan', 'Gudang ACC', 'Kurir',
        ])->update([
            'has_kpi' => true, 'is_manager' => false,
            'area_slug' => 'gudang', 'requires_spv_team' => false,
        ]);
    }
};
```

### 1.2 — Update Position Model

Edit `app/Models/Position.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
// ... existing imports

class Position extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name', 'description', 'created_by',
        // NEW:
        'has_kpi', 'is_manager', 'area_slug', 'requires_spv_team',
    ];

    protected $casts = [
        'has_kpi' => 'boolean',
        'is_manager' => 'boolean',
        'requires_spv_team' => 'boolean',
    ];

    // === KEEP existing constants for backward compat (akan dihapus di Phase 1.7) ===
    public const GUDANG_POSITIONS = ['Gudang BJB', 'Gudang BJM', 'Gudang Gesekan', 'Gudang ACC', 'Kurir', 'Manager Gudang'];
    public const GUDANG_LINE_POSITIONS = ['Gudang BJB', 'Gudang BJM', 'Gudang Gesekan', 'Gudang ACC', 'Kurir'];

    // === NEW scopes ===
    public function scopeKpiEnabled(Builder $q): Builder
    {
        return $q->where('has_kpi', true);
    }
    public function scopeManagers(Builder $q): Builder
    {
        return $q->where('is_manager', true);
    }
    public function scopeArea(Builder $q, string $slug): Builder
    {
        return $q->where('area_slug', $slug);
    }
    public function scopeLineStaff(Builder $q, ?string $areaSlug = null): Builder
    {
        $q = $q->where('is_manager', false);
        if ($areaSlug) $q->where('area_slug', $areaSlug);
        return $q;
    }

    // === Existing relationships unchanged ===
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function users(): HasMany { return $this->hasMany(User::class, 'position_id'); }
    public function permissions(): HasMany { return $this->hasMany(PositionPermission::class); }
    public function kpiDefinitions(): HasMany { return $this->hasMany(KpiTaskDefinition::class); }
    public function reportFields(): HasMany { return $this->hasMany(PositionReportField::class)->orderBy('sort_order'); }
}
```

### 1.3 — Refactor 9 Titik Hardcoded

#### Titik 1: `app/Services/KpiTaskGenerationService.php` line 32-39

```php
// BEFORE
public function generateDailyTasksForUser(User $user, CarbonInterface $date, ?Team $spvTeam = null): Collection
{
    if (! $user->position_id) {
        throw new \Exception('User must have position');
    }
    $positionName = $user->jobPosition?->name;
    $isManager = in_array($positionName, ['Manager HR', 'Manager Operasional'])
        || in_array($positionName, Position::GUDANG_POSITIONS);

    if (! $spvTeam && ! $isManager) {
        $spvTeam = $user->teams()->where('is_spv_team', true)->first();
    }

    if (! $spvTeam && ! $isManager) {
        throw new \Exception('User must be in SPV team');
    }
    // ... rest unchanged
}

// AFTER
public function generateDailyTasksForUser(User $user, CarbonInterface $date, ?Team $spvTeam = null): Collection
{
    if (! $user->position_id) {
        throw new \Exception('User must have position');
    }

    $isManager = (bool) $user->jobPosition?->is_manager;
    $requiresSpv = (bool) $user->jobPosition?->requires_spv_team;

    if (! $spvTeam && $requiresSpv) {
        $spvTeam = $user->teams()->where('is_spv_team', true)->first();
    }

    if (! $spvTeam && $requiresSpv) {
        throw new \Exception('User must be in SPV team');
    }
    // ... rest unchanged
}
```

#### Titik 2: `app/Services/KpiScoringService.php` line 22-30

```php
// BEFORE
$positionName = $user->jobPosition?->name;
$isManager = in_array($positionName, ['Manager HR', 'Manager Operasional'])
    || in_array($positionName, Position::GUDANG_POSITIONS);

$team = $user->teams()->where('is_spv_team', true)->first();
if (! $team && ! $isManager) {
    throw new \Exception('User must be in SPV team');
}

// AFTER
$isManager = (bool) $user->jobPosition?->is_manager;
$requiresSpv = (bool) $user->jobPosition?->requires_spv_team;

$team = $requiresSpv ? $user->teams()->where('is_spv_team', true)->first() : null;

if (! $team && $requiresSpv) {
    throw new \Exception('User must be in SPV team');
}
```

#### Titik 3: `app/Http/Controllers/KpiDashboardController.php` line 47-71 (getPositionArea)

```php
// BEFORE
protected function getPositionArea(): string
{
    $user = auth()->user();
    $path = request()->path();

    if ($user->hasAnyRole(['admin', 'superadmin'])) {
        if (str_starts_with($path, 'hr/')) return 'hr';
        if (str_starts_with($path, 'operational/')) return 'operational';
        if (str_starts_with($path, 'gudang/')) return 'gudang';
        return 'operational';
    }

    $positionName = $user->jobPosition?->name;
    $expectedArea = match (true) {
        $positionName === 'Manager HR' => 'hr',
        $positionName === 'Manager Operasional' => 'operational',
        in_array($positionName, Position::GUDANG_POSITIONS) => 'gudang',
        default => throw new \Exception('Position tidak memiliki akses KPI'),
    };

    $urlArea = null;
    if (str_starts_with($path, 'hr/')) $urlArea = 'hr';
    elseif (str_starts_with($path, 'operational/')) $urlArea = 'operational';
    elseif (str_starts_with($path, 'gudang/')) $urlArea = 'gudang';

    if ($urlArea && $urlArea !== $expectedArea) abort(403, ...);
    return $expectedArea;
}

// AFTER
protected function getPositionArea(): string
{
    $user = auth()->user();
    $path = request()->path();
    $urlArea = $this->extractAreaFromPath($path);

    if ($user->hasAnyRole(['admin', 'superadmin'])) {
        return $urlArea ?: 'operational';
    }

    $position = $user->jobPosition;

    if (! $position?->has_kpi || ! $position->area_slug) {
        abort(403, 'Posisi Anda tidak memiliki akses KPI');
    }

    $expectedArea = $position->area_slug;

    if ($urlArea && $urlArea !== $expectedArea) {
        abort(403, "Akses ditolak. Area Anda: {$expectedArea}");
    }

    return $expectedArea;
}

private function extractAreaFromPath(string $path): ?string
{
    foreach (['hr', 'operational', 'gudang'] as $candidate) {
        if (str_starts_with($path, $candidate . '/')) {
            return $candidate;
        }
    }
    return null;
}
```

#### Titik 4: `app/Http/Controllers/KpiDashboardController.php` line 78-84

```php
// BEFORE
$isManager = in_array($positionName, ['Manager HR', 'Manager Operasional']);
$isGudang = in_array($positionName, Position::GUDANG_POSITIONS);

// AFTER
$isManager = (bool) $user->jobPosition?->is_manager;
$isGudang = $user->jobPosition?->area_slug === 'gudang';
```

#### Titik 5: `app/Http/Controllers/KpiReportController.php` line 32-45

```php
// BEFORE
$area = match (true) {
    $positionName === 'Manager HR' => 'hr',
    $positionName === 'Manager Operasional' => 'operational',
    in_array($positionName, Position::GUDANG_POSITIONS) => 'gudang',
    default => throw new \Exception('Position tidak memiliki akses KPI'),
};

public function canSubmitReports($user): bool
{
    $positionName = $user->jobPosition?->name;
    return in_array($positionName, ['Manager HR', 'Manager Operasional', 'Manager Gudang']);
}

// AFTER
$area = $user->jobPosition?->area_slug;
if (! $user->jobPosition?->has_kpi || ! $area) {
    throw new \Exception('Position tidak memiliki akses KPI');
}

public function canSubmitReports($user): bool
{
    return (bool) $user->jobPosition?->is_manager;
}
```

#### Titik 6: `app/Http/Controllers/KpiCeoController.php` line 25-44

```php
// BEFORE
public function index(Request $request): Response
{
    $managerPositions = ['Manager HR', 'Manager Operasional', 'Manager Gudang'];
    $positionFilter = $request->input('position', 'all');

    $scores = KpiDailyScore::with(['user.jobPosition']);

    if ($positionFilter === 'hr') {
        $scores->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager HR'));
    } elseif ($positionFilter === 'operational') {
        $scores->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Operasional'));
    } elseif ($positionFilter === 'gudang') {
        $scores->whereHas('user.jobPosition', fn ($q) => $q->where('name', 'Manager Gudang'));
    }

    // ... 4-5 x similar whereHas untuk operations, opsScores, allScores, dll
}

// AFTER
public function index(Request $request): Response
{
    $positionFilter = $request->input('position', 'all');

    $scores = KpiDailyScore::with(['user.jobPosition']);

    if (in_array($positionFilter, ['hr', 'operational', 'gudang'])) {
        $scores->whereHas('user.jobPosition', fn ($q) => $q->managers()->area($positionFilter));
    }

    // Sama pattern untuk aggregate queries: pakai Position::managers()->area() atau ->whereHas('jobPosition', scoper)
}
```

#### Titik 7: `app/Http/Controllers/KpiCeoController.php` lines 65-90 (in-memory filtering)

```php
// BEFORE
$hrScores = $allScores->filter(
    fn ($s) => ($s['user']['job_position']['name'] ?? null) === 'Manager HR'
)->values();
$opsScores = $allScores->filter(
    fn ($s) => ($s['user']['job_position']['name'] ?? null) === 'Manager Operasional'
)->values();
// ... 2-3 similar

// AFTER
$hrScores = $allScores->filter(
    fn ($s) => ($s['user']['job_position']['name'] ?? null) === 'Manager HR'
)->values(); // ini tetap sama OK, atau kalau ada kolom is_manager di-flattened scores, refactor

// (Atau kalau pakai transformed collection include is_manager flag, langsung filter by flag)
```

#### Titik 8: `app/Http/Controllers/Api/V1/AgentDailyReportController.php` line 22

```php
// BEFORE
$managerPositions = ['Manager HR', 'Manager Operasional', 'Manager Gudang'];
// ...
->whereHas('user.jobPosition', fn ($q) => $q->whereIn('name', $managerPositions))

// AFTER
// Hapus variabel, langsung pakai query
->whereHas('user.jobPosition', fn ($q) => $q->managers()->whereHas('users'))
```

#### Titik 9: `app/Http/Controllers/GudangController.php` line 16-27

```php
// BEFORE
$positions = Position::GUDANG_LINE_POSITIONS;
if ($request->user()->hasAnyRole(['admin', 'superadmin'])) {
    $positions = array_merge(['Manager Gudang'], $positions);
}
return Inertia::render('gudang/index', [
    'positionName' => $positionName,
    'isMonitoring' => ! in_array($positionName, Position::GUDANG_POSITIONS),
    'isGudangManager' => $positionName === 'Manager Gudang',
    'gudangPositions' => $positions,
]);

// AFTER
$positionsQuery = Position::query()
    ->where('area_slug', 'gudang')
    ->where('is_manager', false)
    ->orderBy('name')
    ->pluck('name')
    ->all();

if ($request->user()->hasAnyRole(['admin', 'superadmin'])) {
    $positionsQuery = array_merge(['Manager Gudang'], $positionsQuery);
}

return Inertia::render('gudang/index', [
    'positionName' => $positionName,
    'isMonitoring' => ! $isGudang,
    'isGudangManager' => (bool) $request->user()->jobPosition?->is_manager,
    'gudangPositions' => $positionsQuery,
]);
```

### 1.4 — Refactor `KpiDashboardController::gudangMonitoring()` (special case)

```php
// BEFORE line 224-228
$gudangUsers = User::whereHas('jobPosition', fn ($q) => $q->whereIn('name', Position::GUDANG_LINE_POSITIONS))

// AFTER
$gudangUsers = User::whereHas('jobPosition', fn ($q) => $q->where('area_slug', 'gudang')->where('is_manager', false))
```

### 1.5 — CLI Command: GenerateDailyKpiTasks.php

```php
// BEFORE
public function handle(KpiTaskGenerationService $service): int
{
    $spvTeam = Team::where('is_spv_team', true)->first();
    if (! $spvTeam) { $this->error('No SPV team found'); return 1; }
    $service->generateDailyTasksForTeam($spvTeam, now());
    $this->info('Daily KPI tasks generated successfully');
    return 0;
}

// AFTER: gabungkan SPV team mode + manager/gudang self-generate
public function handle(KpiTaskGenerationService $service): int
{
    $date = now();

    // 1. Generate untuk SPV team members (mode lama)
    $spvTeam = Team::where('is_spv_team', true)->first();
    if ($spvTeam) {
        $service->generateDailyTasksForTeam($spvTeam, $date);
    }

    // 2. Generate untuk semua user dengan posisi yang punya KPI enabled
    $managerUsers = User::query()
        ->whereNotNull('position_id')
        ->whereHas('jobPosition', fn ($q) => $q->kpiEnabled())
        ->get();

    foreach ($managerUsers as $user) {
        try {
            $service->generateDailyTasksForUser($user, $date, null);
            $this->info("Generated KPI tasks for {$user->name}");
        } catch (\Exception $e) {
            $this->warn("Failed for {$user->name}: {$e->getMessage()}");
        }
    }

    return 0;
}
```

### 1.6 — Cleanup Deprecated Constants

Setelah semua refactor selesai dan tests pass, hapus constant lama di `Position.php`:

```php
// HAPUS (line 15-32):
public const GUDANG_POSITIONS = [...];
public const GUDANG_LINE_POSITIONS = [...];
```

Cari usage terakhir:
```bash
grep -rn "Position::GUDANG_POSITIONS\|Position::GUDANG_LINE_POSITIONS" app/ tests/
```

Pastikan tidak ada lagi — kalau ada, refactor pakai scope baru.

### 1.7 — Tests

```bash
php artisan test --filter="GudangKpi|KpiCeoDashboard|AgentDailyReportApi|DynamicReportTemplate"
```

Tests harus tetap pass karena:
- Posisi existing sudah di-migrate dengan metadata yang sama
- `is_manager=true` untuk 3 manager posisi cocok dengan logic lama
- `area_slug` match dengan hardcoded mapping lama

## Verifikasi Phase 1

- [ ] Migration applied & rows updated. Verify: `php artisan tinker --execute='Position::all()->pluck("name","area_slug","is_manager");'`
- [ ] 9 titik refactor selesai. Verify: `grep -rn "Manager HR\|Manager Operasional" app/ | grep -v test`
- [ ] Tests existing pass tanpa perubahan
- [ ] Manual check: `/gudang/kpi/dashboard` masih bisa diakses untuk Manager Gudang
- [ ] Cron job tetap jalan — generate untuk SPV + managers/gudang

## Next

Lanjut ke [04-phase-2.md](./04-phase-2.md) untuk route generalization.
