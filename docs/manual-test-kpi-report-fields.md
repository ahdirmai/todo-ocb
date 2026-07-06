# Manual Test — Dynamic Report Fields + Aturan Laporan Harian

Fitur diuji:
- Admin UI kelola report field per posisi (`/kpi/admin/report-fields`)
- Submit laporan harian dinamis (Section C SPV) — hanya hari ini, lampau read-only
- Button "Kirim Laporan" hanya untuk anggota area
- CEO/superadmin: monitor daily task + report semua anggota area (read-only)

Base URL: `https://todo-app-v2.test`. Login via UI, atau ketik `! <cmd>` di prompt untuk login shell.

## Akun Uji (real, non-dummy)

| Peran | Email | Area |
|---|---|---|
| SPV Unit 1 (punya team) | `Antonius@ocb.com` | spv |
| Manager Operasional | `muhammadsaifuddin1606@gmail.com` | operational |
| Manager HR | `ocbgroup.recruitment@gmail.com` | hr |
| Manager Gudang | `maulanailyas58866@gmail.com` | gudang |
| Superadmin/CEO | salah satu user role superadmin | — |

Password akun asli: tanyakan pemilik. Superadmin dummy (`@example.*`) tak punya `area_slug` — untuk cek read-only viewer area, buka URL area langsung (resolusi area dari URL segment).

---

## A. Admin UI Report Fields (`/kpi/admin/report-fields`)

Login **superadmin**.

1. Sidebar → **Report Fields**. Halaman muncul, tabs posisi di atas.
2. Tab "SPV Unit 1" → 15 field, grup per seksi (1. HASIL AUDIT … 13. CATATAN).
3. **Tambah Field**: posisi, `field_key` (mis. `test.contoh`), label, tipe `select`, opsi (satu per baris), grup, urutan, wajib. Simpan → muncul di list grup.
4. **Edit** field itu → ubah label → Simpan → berubah. (`field_key` + posisi terkunci saat edit).
5. **Hapus** field test → hilang.
6. `field_key` duplikat di posisi sama → error validasi.
7. `field_key` "Huruf Besar!" → error format.

## B. Submit Laporan — Aturan Hari Ini Saja

Login **SPV** (`Antonius@ocb.com`).

1. `/spv/kpi/dashboard` → tombol **"Kirim Laporan Harian"** tampil.
2. Klik → form 13 seksi Section C. Field `date` prefill hari ini; `select` = dropdown.
3. Isi field wajib → **Kirim** → sukses, redirect dashboard.
4. Buka form lagi hari ini → warning "sudah dikirim", tombol Kirim hilang.
5. Date picker → pilih **kemarin**:
   - Ada laporan kemarin → **read-only**, isi lama tampil, tak bisa submit.
   - Tak ada → warning "tak ada laporan, tak bisa diisi", form kosong read-only.
6. `/spv/kpi/reports` → tombol **Edit** hanya di laporan **hari ini**, tidak di lampau.

## C. Gate Button per Area

1. Login **Manager Operasional** → `/operational/kpi/dashboard` → button "Kirim Laporan CEO" **tampil**.
2. Login **superadmin**, `/operational/kpi/dashboard` → button **TIDAK tampil** (read-only viewer).
3. Ulang cek `/hr/kpi/dashboard`, `/gudang/kpi/dashboard`, `/spv/kpi/dashboard` sebagai superadmin → tak ada button submit.

## D. CEO/Superadmin Monitor Report Semua Anggota

Login **superadmin**.

1. `/spv/kpi/reports` → laporan **semua SPV Unit 1** (bukan cuma sendiri), tiap baris ada nama + posisi.
2. Tak ada tombol Edit/Create (read-only). Tombol **Lihat Detail** tetap ada.
3. Bandingkan login **SPV** → `/spv/kpi/reports` cuma laporan sendiri + bisa Edit (hari ini).

## E. Daily Task Read-Only untuk CEO

Login **superadmin**, `/spv/kpi/dashboard` (atau operational) → task hari terpilih tampil, bisa lihat detail/komentar, **tak ada** tombol submit/generate laporan.

---

## Test Otomatis

```
php artisan test --compact --filter="DynamicReportTemplate|KpiAdminReportField"
```
Harus 23 pass. Coverage: CRUD report field, 403 non-admin, dup/invalid key, aturan hari-ini-saja (tolak submit lampau, read-only page, blokir edit lampau), scoping admin-lihat-semua vs anggota-lihat-sendiri.

Catatan: suite pakai DB dev persisten (no RefreshDatabase). Test bersihkan data sendiri agar idempotent.
