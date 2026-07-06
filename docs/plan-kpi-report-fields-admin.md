# Brief Develop: Admin UI Report Field Dinamis per Posisi + Seed SPV Section C

> Status: Approved, siap develop. Sumber PDF: `KPI-Harian-SPV-Unit-1.pdf` (Section C — Format Laporan Kunjungan Harian SPV).

## 1. Latar Belakang & Tujuan

User ingin fitur **submit laporan harian** seperti **Section C** di PDF, tapi **dinamis per posisi**: tiap posisi bisa punya field berbeda. Contoh submit yang dirujuk user: `https://todo-app-v2.test/gudang/kpi/report/create`.

### Yang SUDAH ADA (jangan dibangun ulang)
Mekanisme submit laporan dinamis per posisi **sudah berjalan penuh**:

| Komponen | Lokasi | Fungsi |
|---|---|---|
| Tabel `position_report_fields` | migration `2026_06_12_155807_*` | Simpan definisi field per posisi |
| Model `PositionReportField` | `app/Models/PositionReportField.php` | fillable + cast `field_options`→array, konstanta `TYPE_*` |
| Relasi `Position::reportFields()` | `app/Models/Position.php:88` | `hasMany(...)->orderBy('sort_order')` |
| `getReportFieldsTemplate()` | `app/Services/KpiReportingService.php:86` | Ambil field per posisi (by **name**) |
| `buildValidationRules()` | `app/Services/KpiReportingService.php:118` | Build rules dinamis dari field |
| `KpiReportController` | create/submit/edit/update | Render `{area}/kpi/report-form` |
| `DynamicReportForm` (React) | `resources/js/components/kpi/dynamic-report-form.tsx` | Render field per grup + attachment |

### Gap yang DIBANGUN di brief ini
1. **Tidak ada UI admin** untuk kelola report field — field hanya lewat seeder. Admin non-developer tak bisa atur.
2. **Field SPV Unit 1 belum sesuai Section C** — reseed jadi 13 seksi.
3. **`renderField` frontend**: `date` & `select` masih render `<Input>` polos. Perbaiki: `date` = prefill tanggal hari ini, `select` = dropdown asli.

**Outcome:** admin bisa CRUD report field tiap posisi via UI (mirror halaman `/kpi/admin/definitions`), dan SPV punya template Section C lengkap.

---

## 2. Skema Data (referensi)

Tabel `position_report_fields`:

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | bigint PK auto-increment | default route binding |
| `position_id` | uuid FK → positions, cascade | |
| `field_key` | string(100) | dot-notation utk nested, mis. `absensi.hadir` |
| `field_label` | string(200) | |
| `field_type` | string(50) | `text`\|`textarea`\|`number`\|`date`\|`select` |
| `field_options` | json nullable | `{placeholder, rows, max_length, options[]}` |
| `group_label` | string(100) nullable | judul card grup di form |
| `is_required` | boolean default false | |
| `sort_order` | unsigned int default 0 | |
| timestamps | | |

Unique: `['position_id','field_key']`. Index: `['position_id','sort_order']`.

Konstanta model (`app/Models/PositionReportField.php`): `TYPE_TEXT`, `TYPE_TEXTAREA`, `TYPE_NUMBER`, `TYPE_DATE`, `TYPE_SELECT`.

---

## 3. Task 1 — Backend `KpiAdminController`

File: `app/Http/Controllers/KpiAdminController.php`. Tambah `use App\Models\PositionReportField;` dan `use Illuminate\Validation\Rule;`. Tambah 4 method (mirror pola `definitions`/`storeDefinition`/... yang sudah ada di file yang sama).

```php
public function reportFields(): Response
{
    $positions = Position::with(['reportFields' => fn ($q) => $q->orderBy('sort_order')])
        ->orderBy('name')
        ->get();

    return Inertia::render('kpi/admin/report-fields', [
        'positions' => $positions,
    ]);
}

public function storeReportField(Request $request): RedirectResponse
{
    $validated = $this->validateReportField($request);

    PositionReportField::create($validated);

    return back()->with('success', 'Report field berhasil ditambahkan');
}

public function updateReportField(Request $request, PositionReportField $reportField): RedirectResponse
{
    $validated = $this->validateReportField($request, $reportField);

    $reportField->update($validated);

    return back()->with('success', 'Report field berhasil diupdate');
}

public function destroyReportField(PositionReportField $reportField): RedirectResponse
{
    $reportField->delete();

    return back()->with('success', 'Report field berhasil dihapus');
}

/**
 * @return array<string, mixed>
 */
protected function validateReportField(Request $request, ?PositionReportField $reportField = null): array
{
    $positionId = $reportField?->position_id ?? $request->input('position_id');

    $uniqueKey = Rule::unique('position_report_fields', 'field_key')
        ->where(fn ($q) => $q->where('position_id', $positionId));

    if ($reportField) {
        $uniqueKey->ignore($reportField->id);
    }

    return $request->validate([
        'position_id' => ['required', 'exists:positions,id'],
        'field_key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_.]+$/', $uniqueKey],
        'field_label' => ['required', 'string', 'max:200'],
        'field_type' => ['required', 'in:text,textarea,number,date,select'],
        'group_label' => ['nullable', 'string', 'max:100'],
        'is_required' => ['boolean'],
        'sort_order' => ['required', 'integer', 'min:0'],
        'field_options' => ['nullable', 'array'],
        'field_options.placeholder' => ['nullable', 'string', 'max:255'],
        'field_options.rows' => ['nullable', 'integer', 'min:1', 'max:20'],
        'field_options.max_length' => ['nullable', 'integer', 'min:1'],
        'field_options.options' => ['nullable', 'array'],
        'field_options.options.*' => ['string', 'max:255'],
    ]);
}
```

Catatan: `field_type` `regex` pakai konstanta value langsung (string) supaya sederhana. `position_id` saat update diambil dari record (posisi field tak boleh pindah).

---

## 4. Task 2 — Routes

File: `routes/web.php`, dalam grup `Route::prefix('kpi/admin')` (setelah baris 176, sebelum `});`):

```php
Route::get('report-fields', [KpiAdminController::class, 'reportFields'])->name('kpi.admin.report-fields');
Route::post('report-fields', [KpiAdminController::class, 'storeReportField'])->name('kpi.admin.report-fields.store');
Route::put('report-fields/{reportField}', [KpiAdminController::class, 'updateReportField'])->name('kpi.admin.report-fields.update');
Route::delete('report-fields/{reportField}', [KpiAdminController::class, 'destroyReportField'])->name('kpi.admin.report-fields.destroy');
```

Grup ini sudah di dalam middleware admin/superadmin (lihat konteks route sekitar `activity.index`). Binding `{reportField}` → `PositionReportField` otomatis (PK id).

Setelah edit route → jalankan `npm run build` (atau dev) supaya Wayfinder generate `@/routes/kpi/admin/report-fields`.

---

## 5. Task 3 — Frontend `resources/js/pages/kpi/admin/report-fields.tsx` (BARU)

Mirror `resources/js/pages/kpi/admin/definitions.tsx`. Struktur:

- **Props**: `{ positions: Position[] }`, `Position = { id, name, report_fields: ReportField[] }`.
  `ReportField = { id, field_key, field_label, field_type, field_options, group_label, is_required, sort_order }`.
  ⚠️ Inertia serialize snake_case: relasi jadi `report_fields` (bukan `reportFields`).
- **Position tabs** di atas (satu tab per posisi) — copy pola tab dari definitions.tsx.
- **List field** posisi terpilih, urut `sort_order`, dikelompokkan per `group_label` (satu card per grup). Tiap field tampil: `#sort_order`, `field_label`, code `field_key`, badge `field_type`, badge "Wajib" bila `is_required`. Tombol edit + hapus (hapus pakai `confirm()`).
- **Dialog create/edit** (`useForm`):
  ```ts
  const { data, setData, post, put, processing, reset } = useForm({
    position_id: '', field_key: '', field_label: '',
    field_type: 'text', group_label: '', is_required: false, sort_order: 1,
    field_options: { placeholder: '', rows: 3, max_length: undefined, options: [] as string[] },
  });
  ```
  Field input:
  - `position_id` — `<select>` posisi (disable saat edit).
  - `field_key` — `<Input>` mono, help text: "huruf kecil, angka, titik, underscore. Titik = nested (mis. `absensi.hadir`)".
  - `field_label` — `<Input>`.
  - `field_type` — `<select>` (text/textarea/number/date/select).
  - `group_label` — `<Input>` (opsional).
  - `sort_order` — `<Input type=number min=0>`.
  - `is_required` — checkbox.
  - **field_options kondisional**:
    - `placeholder` — semua tipe kecuali `date`.
    - `rows` — hanya `textarea`.
    - `max_length` — `text`/`textarea`.
    - `options` — hanya `select`: `<Textarea>` satu opsi per baris → split `\n`, trim, filter kosong → array saat submit.
- **Submit**: import `* as ReportFieldActions from '@/routes/kpi/admin/report-fields'`. Create → `post(ReportFieldActions.store.url())`; edit → `put(ReportFieldActions.update.url({ reportField: editing.id }))`; delete → `router.delete(ReportFieldActions.destroy.url({ reportField: id }))`. Semua `preserveScroll: true`, `onSuccess: () => setOpen(false)`.
- Bersihkan `field_options` sebelum submit: buang key kosong/undefined agar JSON rapi.

---

## 6. Task 4 — Fix `renderField` di `dynamic-report-form.tsx`

File: `resources/js/components/kpi/dynamic-report-form.tsx`, fungsi `renderField` (~baris 196-246). Saat ini `date` & `select` fallback ke `<Input>`. Tambah cabang:

- **`date`**: `<Input type="date" value={value || <hari ini yyyy-mm-dd>} ... />`. Prefill tanggal hari ini bila value kosong (keputusan user: "date = current date"). Hitung sekali: `const today = new Date().toISOString().slice(0,10);`.
- **`select`**: render `<select>` dari `field.field_options?.options ?? []`:
  ```tsx
  <select value={value} onChange={(e) => handleChange(field.field_key, e.target.value)}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
    <option value="">Pilih...</option>
    {(field.field_options?.options ?? []).map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
  ```
Pertahankan `getNestedValue`/`setNestedValue` yang sudah ada untuk dot-notation.

---

## 7. Task 5 — Sidebar link

File: `resources/js/components/app-sidebar.tsx`, tepat setelah item "Task Definitions" (~baris 323). Import icon (mis. `ListChecks` dari lucide-react bila belum ada):

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link href="/kpi/admin/report-fields">
      <ListChecks className="h-4 w-4" />
      <span>Report Fields</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

---

## 8. Task 6 — Seed SPV Section C (13 seksi)

Sumber field: reseed SPV Unit 1. **Pilih satu sumber** — edit blok report-field di `database/seeders/KpiSpvUnit1Seeder.php` (saat ini seed ~15 field) supaya tidak duplikat dengan `PositionReportFieldSeeder`. Pakai `updateOrCreate(['position_id','field_key'], ...)` (idempotent). Semua `field_type = textarea` kecuali disebut; `group_label` = judul seksi PDF.

| # | field_key | group_label | type | required |
|---|---|---|---|---|
| 1 | `audit.minus` | 1. Hasil Audit Toko | text | ya |
| 2 | `audit.plus` | 1. Hasil Audit Toko | text | ya |
| 3 | `audit.total_selisih` | 1. Hasil Audit Toko | text | ya |
| 4 | `beda_harga` | 2. Barang Beda Harga / Belum Ada Barcode | textarea | ya |
| 5 | `rak_acc_kosong` | 3. Rak/Ram ACC Kosong | textarea | ya |
| 6 | `returan` | 4. Barang Returan | textarea | ya |
| 7 | `daftar_harga_spanduk` | 5. Kondisi Daftar Harga & Spanduk Angka | textarea | ya |
| 8 | `barang_kosong_dicari` | 6. Barang Kosong Sering Dicari Customer | textarea | ya |
| 9 | `kebersihan` | 7. Kebersihan & Kerapian Toko | textarea | ya |
| 10 | `brandingan` | 8. Kondisi Brandingan | textarea | ya |
| 11 | `aset_penting` | 9. Aset Penting Toko | textarea | ya |
| 12 | `instore_training` | 10. Laporan In-Store Training | textarea | ya |
| 13 | `aturan_manajemen` | 11. Laporan Aturan Manajemen Toko | textarea | ya |
| 14 | `mobsale` | 12. Laporan Mob-Sale | textarea | ya |
| 15 | `catatan` | 13. Catatan | textarea | tidak |

`sort_order` = urutan tabel di atas (1..15). Placeholder ikut teks bantu PDF (mis. audit minus → "Total minus temuan audit").

---

## 9. Task 7 — Test `tests/Feature/KpiAdminReportFieldTest.php` (BARU, Pest)

Mirror `tests/Feature/DynamicReportTemplateTest.php`. Kasus:
1. Admin bisa `POST report-fields` → field tersimpan (assert DB).
2. Admin bisa `PUT report-fields/{id}` → terupdate.
3. Admin bisa `DELETE report-fields/{id}` → terhapus.
4. Non-admin (user biasa) akses route → 403.
5. `field_key` duplikat di posisi sama → validasi error (422/redirect back w/ errors).
6. Field baru muncul di `KpiReportingService::getReportFieldsTemplate($position->name)`.

Pakai factory `Position`, user role admin (ikuti pola auth di test existing).

---

## 10. Verifikasi

1. Reseed: `php artisan db:seed --class=Database\\Seeders\\KpiSpvUnit1Seeder` → cek SPV = 15 baris field (13 seksi). Atau `migrate:fresh --seed`.
2. `vendor/bin/pint --dirty --format agent`.
3. `npm run build` (generate Wayfinder route baru).
4. `php artisan test --compact --filter=KpiAdminReportField` + `--filter=DynamicReportTemplate` → hijau.
5. Manual di `https://todo-app-v2.test`:
   - Login admin → sidebar **Report Fields** → `/kpi/admin/report-fields`. Tambah/edit/hapus field per posisi, cek muncul per grup.
   - `/spv/kpi/report/create` → form tampil 13 seksi Section C.
   - Submit → tersimpan di `kpi_daily_reports.fields`, muncul di list & detail.
   - Field `date` prefill hari ini; `select` tampil dropdown.
