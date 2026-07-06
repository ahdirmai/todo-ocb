# 06 — Phase 4: CSV/JSON Import & Admin UI

**Effort**: 2-3 jam | **Risk**: Low | **Value**: +3% — polish agar tambah posisi benar-benar CSV/UI, bukan edit PHP.

## Tujuan

Ganti PHP array seeders (~1200 baris di `KpiGudangKurirSeeder.php` & `KpiTaskDefinitionSeeder.php`) dengan CSV/JSON files + Artisan command importer + Bulk Import UI di admin panel.

## Sebelum & Sesudah

### Sebelum

Tambah task baru ke posisi existing (mis. tambah task "Cek Saldo Harian" ke Gudang BJB):
1. Edit `database/seeders/KpiGudangKurirSeeder.php`
2. Tambah row di `$gudangBjbTasks` array
3. Re-run seeder (kalau belum di-prod, re-deploy)
4. Kalo sudah prod: butuh migration atau manual insert

### Sesudah

1. Buka `/kpi/admin/definitions`
2. Pilih opsi "Import CSV"
3. Upload `gudang_bjb_update.csv` dengan baris task baru
4. Save → otomatis muncul di DB aktif

Atau via command line di deployment pipeline:
```bash
php artisan kpi:import-definitions storage/app/finance_kpi.csv --position="Finance Manager"
```

## Komponen

### 4.1 — CSV Format Designer

CSV simple yang readable manusia + bisa di-generate dari Excel:

```csv
# kpi_task_definitions.csv
# Header row wajib:
# position_name, sequence_order, category, task_name, work_method, verification_method, weight

Manager HR,1,Meeting Pagi,"Memimpin Meeting Pagi Harian","<p>Waktu:...</p>","<ul><li>...</li></ul>",8.00
Manager HR,2,Absensi,"Monitoring Absensi Harian 3 Shift","<p>...</p>","<ul><li>...</li></ul>",10.00
Manager Operasional,4,Absensi,"Monitoring Absensi Harian 3 Shift","<p>...</p>","<ul><li>...</li></ul>",10.00
Manager Gudang,16,Reporting,"Rekap Pengawasan Harian & Lapor ke CEO","...","...",8.00
Gudang BJB,7,Gesekan,"Gesek Otto - Target 1.500 pcs","...","...",12.00
...
```

**Catatan**:
- Header sekali di awal
- Comma atau semicolon sebagai separator depends on locale
- HTML dalam `work_method`/`verification_method` (existing seeder sudah begitu)
- Weight decimal 5,2 — max 100% per row

### 4.2 — Artisan Command

```bash
php artisan make:command KpiImportDefinitions
```

```php
<?php
// app/Console/Commands/KpiImportDefinitions.php

namespace App\Console\Commands;

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Illuminate\Console\Attributes\Argument;
use Illuminate\Console\Attributes\Option;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('kpi:import-definitions {file : Path to CSV file} {--position=* : Filter by position name(s)} {--dry-run : Preview only}')]
class KpiImportDefinitions extends Command
{
    public function handle(): int
    {
        $file = $this->argument('file');
        $positionFilter = $this->option('position');
        $isDryRun = (bool) $this->option('dry-run');

        if (! is_readable($file)) {
            $this->error("File tidak ditemukan atau tidak readable: {$file}");
            return 1;
        }

        $handle = fopen($file, 'r');
        $header = fgetcsv($handle); // skip header row

        $expectedHeaders = ['position_name', 'sequence_order', 'category', 'task_name', 'work_method', 'verification_method', 'weight'];

        if (array_map('trim', $header) !== $expectedHeaders) {
            $this->error('Header CSV tidak sesuai format. Expected: ' . implode(',', $expectedHeaders));
            $this->error('Got: ' . implode(',', $header));
            return 1;
        }

        // Position cache by name
        $positionsByName = Position::query()
            ->when(! empty($positionFilter), fn ($q) => $q->whereIn('name', $positionFilter))
            ->get()
            ->keyBy('name');

        if ($positionsByName->isEmpty()) {
            $this->warn('No matching positions found in DB.');
            return 1;
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;

        $this->table($expectedHeaders, []); // empty header

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($expectedHeaders, $row);

            $position = $positionsByName[$data['position_name']] ?? null;
            if (! $position) {
                $skipped++;
                $this->warn("Skipped (position not found): {$data['position_name']} / {$data['task_name']}");
                continue;
            }

            $payload = [
                'position_id' => $position->id,
                'category' => $data['category'],
                'task_name' => $data['task_name'],
                'work_method' => $data['work_method'],
                'verification_method' => $data['verification_method'],
                'weight' => (float) $data['weight'],
                'sequence_order' => (int) $data['sequence_order'],
                'is_active' => true,
            ];

            if ($isDryRun) {
                $this->info("DRY-RUN: would upsert #{$data['sequence_order']} for {$data['position_name']}: {$data['task_name']} (weight {$data['weight']})");
                continue;
            }

            $existing = KpiTaskDefinition::where('position_id', $position->id)
                ->where('task_name', $data['task_name'])
                ->first();

            if ($existing) {
                $existing->update($payload);
                $updated++;
            } else {
                KpiTaskDefinition::create($payload);
                $created++;
            }
        }

        fclose($handle);

        $this->info("Import selesai. Created: {$created}, Updated: {$updated}, Skipped: {$skipped}");
        return 0;
    }
}
```

Usage:

```bash
# Import untuk semua posisi yang ada di CSV
php artisan kpi:import-definitions storage/app/kpi_all.csv

# Import hanya untuk posisi Finance Manager
php artisan kpi:import-definitions storage/app/finance_kpi.csv --position="Finance Manager"

# Dry-run preview
php artisan kpi:import-definitions storage/app/finance_kpi.csv --dry-run --position="Finance Manager"
```

### 4.3 — Strategy Generate CSV dari Existing Seeders

Untuk transisi, generate CSV sekali dari existing PHP arrays:

```bash
php artisan make:command KpiExportDefinitions
```

Exporter baca `KpiGudangKurirSeeder.php` & `KpiTaskDefinitionSeeder.php` dan output `storage/app/kpi_seed_export.csv` dengan format yang sama. Setelah diverifikasi benar, replace kedua seeders dengan single seeder:

```php
// database/seeders/KpiTaskDefinitionSeeder.php (refactored)
class KpiTaskDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->call('kpi:import-definitions', [
            'file' => database_path('data/kpi_task_definitions.csv'),
        ]);
    }
}
```

### 4.4 — Admin UI Bulk Import

Tambah modal di `resources/js/pages/kpi/admin/definitions.tsx`:

```tsx
// resources/js/pages/kpi/admin/definitions.tsx — tambah section

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Definitions({ positions }: Props) {
    const [importOpen, setImportOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const handleImport = async () => {
        if (! csvFile) return;

        const formData = new FormData();
        formData.append('file', csvFile);

        router.post('/kpi/admin/definitions/import', formData, {
            onSuccess: () => {
                toast.success('CSV imported successfully');
                setImportOpen(false);
                setCsvFile(null);
            },
            onError: (errors) => {
                toast.error(errors.file || 'Import failed');
            },
        });
    };

    return (
        <div>
            <div className="flex justify-between">
                <h1>Task Definitions</h1>
                <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
            </div>

            {/* ... existing definition CRUD UI */}

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Import Definitions (CSV)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Upload CSV dengan kolom: position_name, sequence_order, category, task_name, work_method, verification_method, weight
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                            className="..."
                        />
                        <Button onClick={handleImport} disabled={! csvFile}>Import</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
```

Controller endpoint:

```php
// KpiAdminController.php — tambah method

public function importDefinitions(Request $request): RedirectResponse
{
    $request->validate([
        'file' => 'required|file|mimes:csv,txt|max:2048',
    ]);

    $file = $request->file('file');
    $path = $file->storeAs('imports', time() . '_' . $file->getClientOriginalName());

    Artisan::call('kpi:import-definitions', [
        'file' => storage_path("app/{$path}"),
    ]);

    $output = Artisan::output();

    return back()->with('success', "Import selesai. Output: {$output}");
}
```

Route:

```php
// routes/web.php
Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    // ... KPI admin existing routes
    Route::post('/kpi/admin/definitions/import', [KpiAdminController::class, 'importDefinitions'])->name('kpi.admin.import');
});
```

### 4.5 — Export Template CSV

Untuk UX yang lebih baik, sediakan template download:

```php
// KpiAdminController.php — tambah

public function exportTemplate(): \Symfony\Component\HttpFoundation\StreamedResponse
{
    $headers = ['position_name', 'sequence_order', 'category', 'task_name', 'work_method', 'verification_method', 'weight'];
    $rows = [
        ['Manager HR', 1, 'Absensi', 'Contoh Task', '<p>Work method HTML</p>', '<ul><li>Verification</li></ul>', 5.00],
        ['Finance Manager', 1, 'Keuangan', 'Contoh Finance Task', '', '', 10.00],
    ];

    return response()->streamDownload(function () use ($headers, $rows) {
        $out = fopen('php://output', 'w');
        fputcsv($out, $headers);
        foreach ($rows as $row) fputcsv($out, $row);
        fclose($out);
    }, 'kpi_definitions_template.csv');
}
```

## Verifikasi Phase 4

- [ ] CSV `database/data/kpi_task_definitions.csv` dibuat dari export existing data
- [ ] `KpiTaskDefinitionSeeder.php` refactored pakai command
- [ ] `KpiGudangKurirSeeder.php` content migrated, file eventually dihapus
- [ ] Admin UI menampilkan modal "Import CSV" dengan validasi
- [ ] Test: upload CSV baru → task definitions appear di admin list tanpa restart
- [ ] Test command: `php artisan kpi:import-definitions test.csv --dry-run` works

## Next

Lanjut ke [07-rollback-validation.md](./07-rollback-validation.md) untuk backward compat & acceptance.
