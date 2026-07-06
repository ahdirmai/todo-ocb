# 04 — Phase 2: Route Generalization

**Effort**: 1-2 jam | **Risk**: Medium | **Value**: +10% — membuat route tidak perlu di-edit manual saat tambah area baru.

## Tujuan

Ganti route prefix hardcoded (`Route::prefix('hr/kpi')`, `Route::prefix('operational/kpi')`, `Route::prefix('gudang/kpi')`) jadi generic `Route::prefix('{area}/kpi')` dengan validasi area dari DB.

## Trade-off Analysis

| Approach | Pros | Cons |
|----------|------|------|
| Generic prefix `{area}/kpi` ⭐ | Otomatis support area baru | Butuh `whereIn` constraint + middleware |
| Tambah prefix baru tiap release | Simple & explicit | Manual edit tiap area baru |
| Fully dynamic via boot() | Paling otomatis | Magic, susah debug |

**Decision**: Generic prefix dengan constraint + middleware validasi.

## Langkah-Langkah

### 2.1 — Identifikasi Area Valid

Setiap release, valid area list di-load dari DB:

```php
// app/Support/Kpi/ValidAreasResolver.php (NEW)

namespace App\Support\Kpi;

use App\Models\Position;
use Illuminate\Support\Facades\Cache;

class ValidAreasResolver
{
    public const CACHE_KEY = 'kpi_valid_areas';
    public const CACHE_TTL_SECONDS = 3600; // 1 jam

    /**
     * List area_slug dari Position yang punya has_kpi=true.
     * Cached supaya tidak query DB setiap request.
     */
    public static function all(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL_SECONDS,
            fn () => Position::query()
                ->whereNotNull('area_slug')
                ->where('has_kpi', true)
                ->distinct()
                ->pluck('area_slug')
                ->sort()
                ->values()
                ->all()
        );
    }

    /**
     * Force refresh setelah tambah/edit position
     */
    public static function refresh(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
```

### 2.2 — Auto-Refresh Cache Saat Position Updated

Tambah hook di `Position` model:

```php
// app/Models/Position.php — di akhir class

protected static function booted(): void
{
    static::saved(function (Position $position) {
        \App\Support\Kpi\ValidAreasResolver::refresh();
    });

    static::deleted(function (Position $position) {
        \App\Support\Kpi\ValidAreasResolver::refresh();
    });
}
```

### 2.3 — Refactor `routes/web.php`

**Before** (saat ini):

```php
// routes/web.php — multiple hardcoded groups
Route::middleware(['auth', 'verified'])->prefix('hr')->group(function () {
    Route::prefix('kpi')->group(function () {
        Route::get('/', [KpiDashboardController::class, 'index'])->name('hr.kpi.dashboard');
        // ... 5 more routes
    });
});

// Same pattern untuk operational, gudang
```

**After**:

```php
// routes/web.php — single generic group
Route::middleware(['auth', 'verified'])
    ->prefix('{area}/kpi')
    ->whereIn('area', \App\Support\Kpi\ValidAreasResolver::all())
    ->group(function () {
        Route::get('/', [KpiDashboardController::class, 'index'])->name('kpi.dashboard');
        Route::get('/daily/{date?}', [KpiDashboardController::class, 'daily'])->name('kpi.daily');
        Route::get('/weekly/{weekStart?}', [KpiDashboardController::class, 'weekly'])->name('kpi.weekly');
        Route::get('/monthly/{month?}', [KpiDashboardController::class, 'monthly'])->name('kpi.monthly');
        Route::post('/generate', [KpiDashboardController::class, 'generateTasks'])->name('kpi.generate');
        Route::post('/tasks/{task}/verify', [KpiDashboardController::class, 'verifyTask'])->name('kpi.verify');

        Route::get('/reports/create', [KpiReportController::class, 'create'])->name('kpi.report.create');
        Route::post('/reports', [KpiReportController::class, 'store'])->name('kpi.report.store');
        Route::get('/reports/{report}/edit', [KpiReportController::class, 'edit'])->name('kpi.report.edit');
        Route::put('/reports/{report}', [KpiReportController::class, 'update'])->name('kpi.report.update');
        Route::get('/reports', [KpiReportController::class, 'index'])->name('kpi.reports');
    });
```

**Penting**: route name prefix berubah dari `hr.kpi.dashboard` ke `kpi.dashboard`. **Breaking change** — semua `route()` helper dan `<Link>` href harus di-update.

### 2.4 — Update Tests

```php
// tests/Feature/GudangKpiTest.php — sebelum & sesudah

// BEFORE
it('manager gudang bisa akses dashboard', function () {
    $user = makeGudangUser('Manager Gudang');
    $this->actingAs($user)->get('/gudang/kpi/dashboard')->assertOk();
});

// AFTER (route name berubah, URL pattern sama)
it('manager gudang bisa akses dashboard', function () {
    $user = makeGudangUser('Manager Gudang');
    $this->actingAs($user)
        ->get(route('kpi.dashboard', ['area' => 'gudang']))
        ->assertOk();
});
```

### 2.5 — Update Frontend Links (Phase 3 akan rapikan, tapi quick fix dulu)

```bash
# Find all hardcoded /area/kpi/* href di TSX
grep -rn "/hr/kpi\|/operational/kpi\|/gudang/kpi" resources/js/
```

Untuk setiap hasil, ganti dengan helper:

```tsx
// resources/js/lib/url.ts (NEW)
import { usePage } from '@inertiajs/react';
export const useAreaKpiUrl = () => {
    const { props } = usePage();
    const area = (props as { area?: string }).area ?? 'operational';
    return (path: string) => `/${area}/kpi${path}`;
};
```

**Atau lebih bersih**: pakai generate dari Laravel via Wayfinder (lihat `routes/` autogenerated) — sudah ada di-stack per AGENTS.md.

### 2.6 — Handle Special Gudang Monitoring Mode

Route `gudang/kpi/dashboard` punya special case: admin tanpa posisi gudang di-redirect ke `gudangMonitoring()`.

```php
// KpiDashboardController::index() — tambah di awal method
$area = $this->getPositionArea(); // sudah generic
if ($area === 'gudang' && $user->hasAnyRole(['admin', 'superadmin']) && ! $user->jobPosition?->area_slug === 'gudang') {
    return $this->gudangMonitoring($request);
}
```

Logic ini tetap valid dengan refactor Phase 1.

## Risiko & Mitigasi

### Risiko 1: `whereIn` Evaluated Saat routes/cached

Laravel `whereIn` di route definition di-resolve saat pertama kali `Route::load()` dipanggil. Karena `ValidAreasResolver::all()` cache value setelah 1 jam, **perubahan posisi tidak langsung reflected** sampai cache expires.

**Mitigasi**:
- Hook `saved`/`deleted` di `Position::booted()` panggil `ValidAreasResolver::refresh()`
- Clear cache di setiap deploy dengan `php artisan optimize:clear`
- Valid area list di-load ulang setelah deploy via post-deploy script

### Risiko 2: Existing Routes `/hr/kpi/*` Jadi 404

Migrasi step-by-step dengan **dual-route strategy** untuk backward compat:

```php
// Step 1: Tambahkan generic routes FIRE
Route::prefix('{area}/kpi')->whereIn('area', $validAreas)->group(...new routes...);

// Step 2: Tetap pertahankan old `/hr/kpi/*` routes sebagai backward-compat redirect
// (Hapus di phase berikutnya setelah yakin semua link updated)
foreach (['hr', 'operational', 'gudang'] as $deprecated) {
    Route::prefix("$deprecated/kpi/{path?}")->where('path', '.*')->group(function () {
        Route::get('/{any?}', fn ($area, $path = '') => redirect("/$area/kpi/$path", 301));
    });
}
```

### Risiko 3: Route Name Kolisi

Kalau ada route lain di proyek yang bernama `kpi.dashboard`, akan kolisi. Solusi: gunakan prefix yang lebih spesifik, mis. `kpi.area.dashboard`, atau pakai `name()` dengan placeholder area (yang Laravel support via `Route::name()` mid-group).

```php
// Lebih aman:
Route::name('kpi.')->prefix('{area}/kpi')->group(function () {
    Route::get('/', [...])->name('dashboard');
    // Hasil route name: 'kpi.dashboard' — tidak ada area spesifik
});
```

Untuk akses di Inertia/redirect, pakai `route('kpi.dashboard', ['area' => $area])`.

## Verifikasi Phase 2

- [ ] Generic route group registered. Verify: `php artisan route:list | grep kpi`
- [ ] Area valid: `hr`, `operational`, `gudang` muncul di `whereIn` constraint
- [ ] Existing tests yang pakai `/hr/kpi/*` masih redirect atau return expected response
- [ ] Cache invalidation works: tambah posisi baru di admin UI → area baru available dalam 1 request

## Next

Lanjut ke [05-phase-3.md](./05-phase-3.md) untuk frontend consolidation.
