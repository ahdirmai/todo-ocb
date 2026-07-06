# 05 — Phase 3: Frontend Consolidation

**Effort**: 4-6 jam | **Risk**: Medium | **Value**: +7% — menghapus 13+ file TSX duplikat.

## Tujuan

Konsolidasi 20 file TSX (dashboard, daily-detail, weekly-detail, monthly-detail, report-form, reports, no-access × 3 area) jadi **7 file generik** yang menerima `areaSlug` via Inertia shared prop.

## Sebelum & Sesudah

### Sebelum

```
resources/js/pages/
├── hr/kpi/
│   ├── dashboard.tsx              (280 baris)
│   ├── daily-detail.tsx           (180 baris)
│   ├── weekly-detail.tsx          (180 baris)
│   ├── monthly-detail.tsx         (180 baris)
│   ├── report-form.tsx            (300 baris)
│   ├── reports.tsx                (200 baris)
│   └── no-access.tsx              (60 baris)
├── operational/kpi/              ← 7 file identik dengan route prefix beda
└── gudang/kpi/                    ← 6 file (gudang tidak punya report-form)
```

**Total**: 20 file TSX `*/kpi/*`, ~4500 baris kode.

### Sesudah

```
resources/js/pages/Kpi/
├── Dashboard.tsx                  (300 baris — generic, area via prop)
├── DailyDetail.tsx                (180 baris)
├── WeeklyDetail.tsx               (180 baris)
├── MonthlyDetail.tsx              (180 baris)
├── ReportForm.tsx                 (300 baris)
├── ReportsList.tsx                (200 baris)
└── NoAccess.tsx                   (60 baris)
```

**Total**: 7 file TSX, ~1400 baris.

## Langkah-Langkah

### 3.1 — Update `HandleInertiaRequests` Middleware

Bagikan `areaSlug` via shared props.

```php
// app/Http/Middleware/HandleInertiaRequests.php

public function share(Request $request): array
{
    $user = $request->user();

    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $user?->only(['id', 'name', 'email']),
            'isSuperadmin' => $user?->hasAnyRole(['superadmin']),
            'isAdmin' => $user?->hasAnyRole(['admin', 'superadmin']),
            'position' => $user?->jobPosition?->only(['id', 'name', 'area_slug', 'is_manager', 'has_kpi']),
        ],
        'areaSlug' => $this->resolveAreaSlug($request),
        // ... existing shares
    ]);
}

private function resolveAreaSlug(Request $request): ?string
{
    $path = $request->path();
    foreach (['hr', 'operational', 'gudang'] as $candidate) {
        if (str_starts_with($path, $candidate . '/')) {
            return $candidate;
        }
    }
    return null;
}
```

### 3.2 — Bikin `resources/js/pages/Kpi/Dashboard.tsx`

Gunakan sebagai template generik. Exemplar skeleton:

```tsx
// resources/js/pages/Kpi/Dashboard.tsx
import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradeBadge } from '@/components/kpi/grade-badge';
import { ScoreCard } from '@/components/kpi/score-card';
import { useAddDays } from '@/hooks/use-add-days';
import type { PageProps } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface KpiDashboardProps extends PageProps {
    selectedDate: string;
    dateScore: {
        total_score: number; completed_weight: number; total_weight: number;
        total_tasks: number; completed_tasks: number; verified_tasks: number;
        grade: string; category_breakdown: Record<string, any>;
    } | null;
    dateTasks: Array<{
        id: string; title: string; category: string; task_name: string;
        weight: number; description: string; is_done: boolean; is_verified: boolean;
        comment_count: number; has_media: boolean;
        creator: { name: string; email: string };
        comments: Array<any>;
    }>;
    spvKanbanTasks: Array<any>;
    weeklyScores: Array<any>;
    monthlyScore: any;
    hasTasksForDate: boolean;
    canGenerateForDate: boolean;
    canGenerateTasks: boolean;
    isManager: boolean;
}

export default function Dashboard(props: KpiDashboardProps) {
    const { areaSlug, auth } = usePage().props as PageProps & { areaSlug?: string };
    const area = areaSlug ?? 'operational';

    const kpiBase = `/${area}/kpi`;
    const addDays = useAddDays();

    return (
        <AppLayout>
            <Head title={`KPI Dashboard — ${area.toUpperCase()}`} />

            <div className="flex flex-col gap-6 p-6">
                {/* Header dengan date navigation */}
                <Header
                    selectedDate={props.selectedDate}
                    onPrev={() => router.get(`${kpiBase}?date=${addDays(props.selectedDate, -1)}`)}
                    onNext={() => router.get(`${kpiBase}?date=${addDays(props.selectedDate, 1)}`)}
                    canGenerateTasks={props.canGenerateTasks}
                    canGenerateForDate={props.canGenerateForDate}
                    onGenerate={() => router.post(`${kpiBase}/generate`, { date: props.selectedDate })}
                />

                {props.dateScore ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        <ScoreCard title="Today's Score" score={props.dateScore.total_score} grade={props.dateScore.grade} />
                        <ScoreCard title="Tasks Completed" score={`${props.dateScore.completed_tasks}/${props.dateScore.total_tasks}`} />
                        <ScoreCard title="Verified" score={`${props.dateScore.verified_tasks}/${props.dateScore.total_tasks}`} />
                    </div>
                ) : (
                    <EmptyDateCard hasTasks={props.hasTasksForDate} canGenerate={props.canGenerateForDate && props.canGenerateTasks} />
                )}

                {/* Daily task list */}
                <TaskList tasks={props.dateTasks} areaSlug={area} />

                {/* Weekly + Monthly aggregates */}
                <AggregateSummary weeklyScores={props.weeklyScores} monthlyScore={props.monthlyScore} />
            </div>
        </AppLayout>
    );
}
```

### 3.3 — Bikin Shared Components

Untuk mendukung generic dashboard, bikin:

```tsx
// resources/js/components/kpi/kpi-task-card.tsx
export interface KpiTaskCardProps {
    task: {
        id: string;
        title: string;
        category?: string;
        task_name: string;
        weight: number;
        description: string;
        is_verified: boolean;
        comment_count: number;
        has_media: boolean;
    };
    areaSlug: string;
}

export function KpiTaskCard({ task, areaSlug }: KpiTaskCardProps) {
    // Render dengan link ke detail modal/embedded
}
```

### 3.4 — Update `routes/web.php` Render Paths

```php
// Sebelum
return Inertia::render("{$area}/kpi/dashboard", [...]);

// Sesudah (harus pakai path absolut, atau lewat resolver)
return Inertia::render('Kpi/Dashboard', [...]);
```

Untuk controller yang punya area-dependent rendering:

```php
// Generic resolve page path
private function kpiPage(string $name): string
{
    return "Kpi/{$name}"; // "Kpi/Dashboard", "Kpi/DailyDetail", etc.
}

// Usage:
return Inertia::render($this->kpiPage('Dashboard'), [...]);
return Inertia::render($this->kpiPage('DailyDetail'), [...]);
```

### 3.5 — Inertia v3 `resolvePageComponent` Opsional

Inertia v3 sudah punya `resolvePageComponent` yang dipakai Wayfinder untuk resolve page path. Bisa pakai pattern:

```php
// Di controller:
return Inertia::render('Kpi/Dashboard', [...]);
```

Inertia akan resolve ke `resources/js/pages/Kpi/Dashboard.tsx`.

### 3.6 — Update Sidebar Component

```tsx
// resources/js/components/app-sidebar.tsx — line 210 area
const { props } = usePage();
const userAreaSlug = props.auth?.position?.area_slug;

{['hr', 'operational', 'gudang'].map((area) => (
    userAreaSlug === area || props.auth?.isAdmin ? (
        <Link key={area} href={`/${area}/kpi/dashboard`}>
            KPI Dashboard
        </Link>
    ) : null
))}
```

### 3.7 — Migrate Step-by-Step (Avoid Big-Bang)

Migrasi setiap area satu per satu:

```
Gudang → HR → Operational
```

Untuk tiap area:
1. Bikin `Kpi/Dashboard.tsx` (generic)
2. Update `KpiDashboardController::index()` render ke `Kpi/Dashboard`
3. Test `/gudang/kpi/dashboard` render dengan benar
4. Hapus `gudang/kpi/dashboard.tsx`
5. Ulang untuk daily/weekly/monthly
6. Lanjut ke area berikutnya

### 3.8 — Migration Map

| File lama | File baru |
|-----------|-----------|
| `resources/js/pages/hr/kpi/dashboard.tsx` | `resources/js/pages/Kpi/Dashboard.tsx` |
| `resources/js/pages/operational/kpi/dashboard.tsx` | (sama — dihapus) |
| `resources/js/pages/gudang/kpi/dashboard.tsx` | (sama — dihapus) |
| `hr/kpi/daily-detail.tsx`, dst. | `Kpi/DailyDetail.tsx`, dst. |
| `hr/kpi/report-form.tsx`, dst. | `Kpi/ReportForm.tsx`, dst. |

Total file: 20 → 7.

## Risiko

### Risiko 1: Per-Area Logic Berbeda yang Tersembunyi

Saat baca semua 7 file `hr/kpi/dashboard.tsx` vs `operational/kpi/dashboard.tsx` vs `gudang/kpi/dashboard.tsx`, mungkin ada edge case yang beda. Solusinya: refactor pakai **substring diff** untuk identifikasi logic yang spesifik.

### Risiko 2: Hardcoded Route Names

Setiap file TSX mungkin pakai route `route('hr.kpi.dashboard')`. Kalau pakai Phase 2 generic route names (`route('kpi.dashboard', { area: 'hr' })`), ini adalah mass find-replace.

## Verifikasi Phase 3

- [ ] `/hr/kpi/dashboard`, `/operational/kpi/dashboard`, `/gudang/kpi/dashboard` semuanya render & sama baik
- [ ] 13 file TSX lama dihapus
- [ ] Code count turun signifikan (`git diff --stat resources/js/pages/`)
- [ ] Tidak ada regression di visual/UI

## Next

Lanjut ke [06-phase-4.md](./06-phase-4.md) untuk CSV bulk import.
