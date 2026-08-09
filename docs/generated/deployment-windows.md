# OCB KPI Management — Panduan Deployment (Windows Server + Laragon + MySQL)

**Aplikasi:** OCB KPI Management (`todo-app-v2`)
**Target host:** Windows Server (mis. 2019/2022)
**Path aplikasi:** `C:\KPI OCB`
**Stack:** Laragon (Apache/Nginx + PHP 8.4) · MySQL 8 · Node.js 20+ · Composer 2
**Domain contoh:** `kpi.ocbgroup.web.id`
**Zona waktu KPI:** WITA (Asia/Makassar, UTC+8) — dipatok di kode, apa pun TZ server
**Versi dokumen:** 2026-08-09

> Dokumen ini khusus deployment di **Windows Server dengan Laragon**. Untuk konsep arsitektur & fitur, lihat `technical-documentation.md`. Untuk panduan pemakaian, lihat `user-manual.md`.

---

## Daftar Isi

1. [Ikhtisar Arsitektur Runtime](#1-ikhtisar-arsitektur-runtime)
2. [Prasyarat & Software](#2-prasyarat--software)
3. [Instalasi Laragon](#3-instalasi-laragon)
4. [Menyiapkan Folder Aplikasi (C:\KPI OCB)](#4-menyiapkan-folder-aplikasi-ckpi-ocb)
5. [Database MySQL (aplikasi + absensi)](#5-database-mysql-aplikasi--absensi)
6. [Konfigurasi .env](#6-konfigurasi-env)
7. [Build & Migrasi](#7-build--migrasi)
8. [Virtual Host / Domain](#8-virtual-host--domain)
9. [Queue Worker (Windows Service)](#9-queue-worker-windows-service)
10. [Task Scheduler (pengganti cron)](#10-task-scheduler-pengganti-cron)
11. [Integrasi Absensi (absen_management)](#11-integrasi-absensi-absen_management)
12. [Konfigurasi AI (opsional)](#12-konfigurasi-ai-opsional)
13. [Optimasi Produksi](#13-optimasi-produksi)
14. [Update / Deploy Ulang](#14-update--deploy-ulang)
15. [Backup & Restore](#15-backup--restore)
16. [Troubleshooting Windows](#16-troubleshooting-windows)
17. [Checklist Go-Live](#17-checklist-go-live)

---

## 1. Ikhtisar Arsitektur Runtime

Aplikasi Laravel + Inertia (React) yang berjalan sebagai **satu web app**. Di Windows Server dengan Laragon, komponen yang harus hidup:

```
┌─────────────────────────────────────────────────────────────┐
│ Windows Server                                              │
│                                                            │
│  Laragon ──► Apache/Nginx + PHP 8.4  ──►  C:\KPI OCB\public │
│                     │                                       │
│                     ▼                                       │
│               MySQL 8  ──►  kpi_ocb           (baca/tulis)  │
│                         └─►  absen_management (baca-saja)   │
│                                                            │
│  Windows Service (NSSM)  ──►  php artisan queue:work        │
│  Windows Task Scheduler  ──►  php artisan schedule:run (1m) │
└─────────────────────────────────────────────────────────────┘
```

Tiga proses yang WAJIB berjalan di produksi:

| Proses | Fungsi | Cara jalan di Windows |
|--------|--------|-----------------------|
| **Web** (Apache/Nginx + PHP-FPM/CGI) | Melayani HTTP | Laragon (auto-start) |
| **Queue worker** | Job async: cek AI, parsing SOP, recap bulanan, pengingat | Windows Service via NSSM |
| **Scheduler** | Skor harian/mingguan/bulanan, pengingat, pengumuman berulang | Windows Task Scheduler tiap 1 menit |

Tanpa queue worker: cek AI & parsing SOP tidak jalan. Tanpa scheduler: skor tidak pernah dihitung.

---

## 2. Prasyarat & Software

| Software | Versi | Catatan |
|----------|-------|---------|
| Windows Server | 2019 / 2022 | Akses Administrator |
| Laragon | Full edition terbaru | Membawa Apache/Nginx, PHP, MySQL, Composer, Node |
| PHP | **8.4** | Ekstensi: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd`, `zip`, `curl`, `exif`, `intl` |
| MySQL | 8.x | Bisa dari Laragon |
| Node.js | 20+ | Untuk build asset (Vite) |
| Composer | 2.x | Dependency PHP |
| NSSM | terbaru | Menjalankan queue worker sebagai service — [nssm.cc](https://nssm.cc) |
| Git | opsional | Untuk pull update |

> **PHP versi:** Laravel 13 + kode ini menuntut PHP 8.4. Pastikan Laragon memakai PHP 8.4 (`Menu Laragon → PHP → Version`). Bila belum ada, unduh PHP 8.4 x64 Thread-Safe dan taruh di `C:\laragon\bin\php\php-8.4.x`, lalu pilih di menu.

### Ekstensi PHP yang harus aktif

Buka `php.ini` (Laragon: `Menu → PHP → php.ini`) dan pastikan tidak ada `;` di depan:

```ini
extension=pdo_mysql
extension=mbstring
extension=openssl
extension=fileinfo
extension=gd
extension=zip
extension=curl
extension=exif
extension=intl
```

`fileinfo` + `gd` + `exif` wajib untuk Spatie Media Library (upload foto/video bukti KPI).

---

## 3. Instalasi Laragon

1. Unduh **Laragon Full** dari [laragon.org](https://laragon.org/download/).
2. Install ke `C:\laragon` (default).
3. Jalankan Laragon → **Start All** (Apache/Nginx + MySQL menyala).
4. Set PHP ke 8.4: **Menu → PHP → Version → 8.4.x**.
5. Set Node ke 20+: **Menu → Node.js → Version**.
6. Verifikasi lewat terminal Laragon (**Menu → Terminal**):

```powershell
php -v          # harus 8.4.x
composer -V     # 2.x
node -v         # 20+
mysql --version # 8.x
```

> Laragon Terminal sudah menaruh php/composer/node/mysql di PATH. Selalu pakai terminal ini untuk perintah artisan.

---

## 4. Menyiapkan Folder Aplikasi (C:\KPI OCB)

Aplikasi dideploy ke `C:\KPI OCB` (di luar `C:\laragon\www` — virtual host akan diarahkan ke sana).

```powershell
# Buat folder & masuk
mkdir "C:\KPI OCB"
cd "C:\KPI OCB"

# Ambil kode (pilih salah satu)
git clone <repository-url> .
#   atau salin/ekstrak rilis ke C:\KPI OCB
```

Struktur setelah clone: `app\`, `public\`, `routes\`, `config\`, `resources\`, dst. **Document root nanti = `C:\KPI OCB\public`**.

> **Spasi pada path:** `C:\KPI OCB` mengandung spasi. Di perintah/config selalu bungkus dengan tanda kutip: `"C:\KPI OCB"`.

---

## 5. Database MySQL (aplikasi + absensi)

Aplikasi memakai **dua database** di server MySQL yang sama:

| Database | Peran | Akses aplikasi |
|----------|-------|----------------|
| `kpi_ocb` | Data utama aplikasi | Baca & tulis |
| `absen_management` | Data absensi karyawan (dari sistem absensi terpisah) | **Baca-saja** |

### Buat database aplikasi

Lewat terminal Laragon:

```powershell
mysql -u root -p
```

```sql
CREATE DATABASE kpi_ocb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- (opsional) user khusus aplikasi
CREATE USER 'kpi_app'@'localhost' IDENTIFIED BY 'PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON kpi_ocb.* TO 'kpi_app'@'localhost';

-- akses baca-saja ke DB absensi (bila sudah ada)
GRANT SELECT ON absen_management.* TO 'kpi_app'@'localhost';
FLUSH PRIVILEGES;
```

### Database absensi

`absen_management` disediakan oleh **sistem absensi eksternal** dan harus berada di server MySQL yang sama (migrasi mapping absen melakukan JOIN lintas-skema). Bila belum ada, impor dump-nya lebih dulu. Aplikasi hanya membaca tabel `absensi` dan `user` di sana — tidak pernah menulis.

> Bila DB absensi berada di server berbeda, isi `DB_ABSEN_HOST/PORT/USERNAME/PASSWORD` terpisah di `.env`. Tapi migrasi seeding `absen_user_id` mengandalkan JOIN satu-server; bila beda server, mapping harus diisi manual.

---

## 6. Konfigurasi .env

Salin template lalu edit:

```powershell
cd "C:\KPI OCB"
copy .env.example .env
php artisan key:generate
```

Edit `.env` (pakai editor apa pun) — nilai produksi penting:

```dotenv
APP_NAME="OCB KPI Management"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://kpi.ocbgroup.web.id
APP_TIMEZONE=UTC          # KPI tetap pakai WITA di kode; jangan andalkan TZ server

# --- Database utama ---
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kpi_ocb
DB_USERNAME=kpi_app
DB_PASSWORD=PASSWORD_KUAT

# --- Database absensi (baca-saja) ---
# Host/port/user/pass mewarisi DB utama bila dikosongkan
DB_ABSEN_DATABASE=absen_management
# DB_ABSEN_HOST=127.0.0.1
# DB_ABSEN_USERNAME=kpi_app
# DB_ABSEN_PASSWORD=PASSWORD_KUAT

# --- Queue / cache / session (driver database) ---
QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database
SESSION_LIFETIME=120

# --- Mail (sesuaikan SMTP kantor) ---
MAIL_MAILER=smtp
MAIL_HOST=smtp.contoh.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS="no-reply@ocbgroup.web.id"
MAIL_FROM_NAME="${APP_NAME}"

# --- Observability (opsional) ---
NIGHTWATCH_ENABLED=false
NIGHTWATCH_TOKEN=

# --- AI (opsional; lihat §12) ---
AI_TASK_CHECK_ENABLED=true
AI_TASK_CHECK_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TASK_CHECK_MODEL=gpt-5.4-nano

# --- KPI flags ---
KPI_ALLOW_BACKDATED_REPORT=false
```

> **APP_KEY** harus terisi (`php artisan key:generate` mengurusnya). **APP_DEBUG=false** wajib di produksi agar error tidak bocor.

---

## 7. Build & Migrasi

Dari `C:\KPI OCB` di terminal Laragon:

```powershell
# 1. Dependency PHP (produksi)
composer install --no-dev --optimize-autoloader

# 2. Dependency & build frontend
npm install
npm run build

# 3. Migrasi database (buat tabel + seed absen_user_id)
php artisan migrate --force

# 4. Seed data awal (role, posisi, definisi KPI, dll.)
php artisan db:seed --force

# 5. Symlink storage → public (agar upload foto tampil)
php artisan storage:link
```

### Catatan storage:link di Windows

`storage:link` membuat symbolic link `public\storage → storage\app\public`. Di Windows perintah ini **butuh hak Administrator** (atau Developer Mode aktif). Jalankan terminal Laragon **As Administrator**. Bila symlink gagal/diblokir kebijakan, alternatif: salin manual atau aktifkan Developer Mode Windows.

### Seeder penting

| Seeder | Isi |
|--------|-----|
| `RolePermissionSeeder` | Role `superadmin`, `admin`, `member` + permission |
| `SuperAdminSeeder` | Akun superadmin awal |
| `PositionGroupSeeder` | Grup posisi (Direktur → Manager → SPV → Staff → Tim) |
| `KpiTaskDefinitionSeeder` / `KpiGudangKurirSeeder` / `KpiSpvUnit1Seeder` | Definisi tugas KPI per posisi |
| `PositionReportFieldSeeder` | Template kolom Laporan Harian per posisi |
| `StoreSeeder` | Toko/cabang (kode OC) |

Setelah seeding, login superadmin awal lalu **ganti password** via Pengaturan → Keamanan.

---

## 8. Virtual Host / Domain

Laragon bisa auto-membuat vhost, tapi karena app di luar `www`, buat manual.

### Apache (Laragon default)

Buat `C:\laragon\etc\apache2\sites-enabled\kpi-ocb.conf`:

```apache
<VirtualHost *:80>
    ServerName kpi.ocbgroup.web.id
    DocumentRoot "C:/KPI OCB/public"
    <Directory "C:/KPI OCB/public">
        AllowOverride All
        Require all granted
        Options FollowSymLinks
    </Directory>
    ErrorLog "C:/KPI OCB/storage/logs/apache-error.log"
</VirtualHost>
```

> Pakai garis miring maju `/` pada path Apache, walau di Windows.

### Nginx (bila Laragon diset ke Nginx)

Buat `C:\laragon\etc\nginx\sites-enabled\kpi-ocb.conf`:

```nginx
server {
    listen 80;
    server_name kpi.ocbgroup.web.id;
    root "C:/KPI OCB/public";
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;   # sesuaikan port PHP-CGI Laragon
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

Setelah edit vhost: **Menu Laragon → Apache/Nginx → Reload** (atau Stop/Start All).

### DNS / hosts

- Produksi: arahkan A-record `kpi.ocbgroup.web.id` → IP server.
- Uji lokal: tambah di `C:\Windows\System32\drivers\etc\hosts`:
  ```
  127.0.0.1  kpi.ocbgroup.web.id
  ```

### HTTPS

Untuk publik, pasang sertifikat (Let's Encrypt via win-acme, atau sertifikat kantor) dan tambah blok `:443`. Laragon juga punya SSL otomatis untuk domain `.test` lokal (**Menu → Apache → SSL**).

---

## 9. Queue Worker (Windows Service)

Job async (cek AI, parsing SOP, recap bulanan) butuh worker berjalan terus. Di Windows, jalankan sebagai **service** dengan NSSM agar auto-restart & auto-start saat boot.

### Pasang lewat NSSM

1. Unduh NSSM, taruh `nssm.exe` di `C:\nssm\`.
2. Terminal **As Administrator**:

```powershell
C:\nssm\nssm.exe install "KPI-OCB-Queue"
```

Isi dialog NSSM:

| Field | Nilai |
|-------|-------|
| **Application → Path** | `C:\laragon\bin\php\php-8.4.x\php.exe` |
| **Application → Startup directory** | `C:\KPI OCB` |
| **Application → Arguments** | `artisan queue:work --tries=3 --timeout=90 --sleep=3 --max-jobs=1000 --max-time=3600` |
| **Details → Display name** | KPI OCB Queue Worker |
| **I/O → Output/Error** | `C:\KPI OCB\storage\logs\queue.log` |
| **Exit actions → Restart** | Restart application |

3. Jalankan:

```powershell
C:\nssm\nssm.exe start "KPI-OCB-Queue"
```

> **Penting:** Setiap kali deploy kode baru, **restart service** agar worker memuat kode terbaru:
> ```powershell
> C:\nssm\nssm.exe restart "KPI-OCB-Queue"
> ```
> `--max-time=3600` membuat worker keluar tiap jam (NSSM me-restart) sehingga memory bersih.

Sesuaikan `php-8.4.x` dengan versi PHP nyata di `C:\laragon\bin\php\`.

---

## 10. Task Scheduler (pengganti cron)

Linux pakai cron `* * * * *`. Windows pakai **Task Scheduler** memanggil `schedule:run` tiap menit.

### Buat file batch

Buat `C:\KPI OCB\schedule-run.bat`:

```bat
@echo off
cd /d "C:\KPI OCB"
"C:\laragon\bin\php\php-8.4.x\php.exe" artisan schedule:run >> "C:\KPI OCB\storage\logs\schedule.log" 2>&1
```

### Daftarkan task (PowerShell As Administrator)

```powershell
$action  = New-ScheduledTaskAction -Execute "C:\KPI OCB\schedule-run.bat"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
           -RepetitionInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "KPI-OCB-Scheduler" `
  -Action $action -Trigger $trigger -Principal $principal `
  -Description "Laravel schedule:run tiap 1 menit"
```

Atau via GUI **Task Scheduler**: Create Task → Trigger *Daily*, repeat *every 1 minute* selama *1 day*, indefinitely → Action *Start a program* → `schedule-run.bat`.

### Jadwal yang dijalankan (WITA)

| Perintah | Jadwal | Fungsi |
|----------|--------|--------|
| `app:kpi-calculate-daily-scores` | Harian 23:00 | Hitung skor harian setelah batas laporan |
| `app:kpi-send-report-reminder` | Harian 21:00 | Ingatkan pengisi laporan |
| `app:kpi-calculate-weekly-scores` | Senin 01:00 | Rekap mingguan |
| `app:kpi-calculate-monthly-scores` | Tgl 1, 02:00 | Rekap bulanan + bonus |
| `DispatchRecurringAnnouncements` | tiap detik | Materialisasi pengumuman berulang |

> **Generate task KPI TIDAK dijadwalkan.** Tugas dibuat manual per user dan **digerbang absensi** (user harus check-in dulu). Task Scheduler cukup memanggil `schedule:run`; sisanya diatur Laravel.

> **Zona waktu:** Semua jadwal KPI dipatok `Asia/Makassar` di kode, jadi jam di atas benar walau TZ Windows berbeda. Task Scheduler cukup jalan tiap menit.

---

## 11. Integrasi Absensi (absen_management)

Fitur **attendance gate**: user tidak bisa generate tugas KPI sebelum absen hari itu.

### Cara kerja

1. `users.absen_user_id` memetakan user aplikasi ke user di `absen_management`.
2. Saat user klik **Generate Task**, `AttendanceService::hasCheckedInOn` mengecek adakah baris `absensi` valid (`is_valid = 1`) untuk `absen_user_id` pada tanggal itu.
3. Tidak ada absen valid → generate ditolak: *"Anda belum absen hari ini…"*.

### Mapping absen_user_id

Migrasi `2026_08_04_132910_add_absen_user_id_to_users_table` mengisi mapping otomatis dengan mencocokkan **nama** (`users.name` ↔ `absen_management.user.name`, non-deleted). Yang tidak cocok tetap `null` dan **harus diisi manual**.

Cek yang belum termapping:

```powershell
php artisan tinker --execute "echo \App\Models\User::whereNull('absen_user_id')->pluck('name')->implode(', ');"
```

Isi manual (contoh):

```sql
UPDATE users SET absen_user_id = 123 WHERE email = 'staff@ocbgroup.web.id';
```

### Prasyarat

- DB `absen_management` reachable dari server aplikasi.
- Tabel `absensi` (`user_id`, `absen_time`, `is_valid`) & `user` (`user_id`, `name`, `is_deleted`) tersedia.
- User MySQL aplikasi punya `SELECT` di `absen_management`.

---

## 12. Konfigurasi AI (opsional)

Cek kepatuhan bukti KPI, parsing SOP, dan recap bulanan pakai AI. Bila tidak dipakai, set `AI_TASK_CHECK_ENABLED=false` — penilaian jatuh ke aturan tiga-tingkat deterministik.

Pilih provider via `AI_TASK_CHECK_PROVIDER`:

| Provider | Env yang diisi | Catatan |
|----------|----------------|---------|
| `openai` | `OPENAI_API_KEY`, `OPENAI_TASK_CHECK_MODEL` | API publik OpenAI |
| `9route` | `NINE_ROUTE_API_KEY`, `NINE_ROUTE_BASE_URL`, `NINE_ROUTE_TASK_CHECK_MODEL` | **Gateway lokal/on-prem** OpenAI-compatible (default `http://localhost:20128/v1`) — cocok bila tak ingin panggil API luar |
| `anthropic` / `gemini` | `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Dipakai terutama untuk parsing SOP & recap |

Model penilaian sekarang: AI memberi **skor langsung 0–100**, **lulus ≥ 75**, maksimal 3 percobaan (lihat `technical-documentation.md` §15).

> AI berjalan di **queue** — pastikan queue worker (§9) hidup, jika tidak skor AI tidak pernah keluar.

---

## 13. Optimasi Produksi

Setelah `.env` final, cache konfigurasi & route:

```powershell
cd "C:\KPI OCB"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

> **Setelah mengubah `.env`, WAJIB `php artisan config:cache` ulang** (atau `config:clear`) — cache lama menutupi perubahan.

Verifikasi Wayfinder (route TypeScript) sudah ikut ter-build saat `npm run build`. Bila route berubah, jalankan `php artisan wayfinder:generate` lalu `npm run build` lagi.

### Izin folder

Pastikan proses web & service bisa menulis:

```
C:\KPI OCB\storage\**
C:\KPI OCB\bootstrap\cache\**
```

Beri **Modify** untuk akun yang menjalankan Apache/PHP dan service queue (mis. `SYSTEM` / `IIS_IUSRS` / user Laragon).

---

## 14. Update / Deploy Ulang

Alur update kode di server:

```powershell
cd "C:\KPI OCB"

# 1. (opsional) maintenance mode
php artisan down

# 2. Ambil kode baru
git pull            # atau salin rilis baru

# 3. Dependency
composer install --no-dev --optimize-autoloader
npm install
npm run build

# 4. Migrasi
php artisan migrate --force

# 5. Refresh cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Restart queue worker (WAJIB — muat kode baru)
C:\nssm\nssm.exe restart "KPI-OCB-Queue"

# 7. Keluar maintenance
php artisan up
```

> Lupa restart queue worker = job async masih pakai kode lama. Selalu langkah 6.

---

## 15. Backup & Restore

### Backup database

```powershell
mysqldump -u root -p kpi_ocb > "C:\Backup\kpi_ocb_%DATE%.sql"
```

Jadwalkan harian via Task Scheduler. **Jangan** backup `absen_management` dari sini (milik sistem absensi).

### Backup file upload

Folder `C:\KPI OCB\storage\app\public` berisi foto/video bukti KPI & avatar. Backup rutin:

```powershell
robocopy "C:\KPI OCB\storage\app\public" "C:\Backup\kpi-storage" /MIR
```

### Restore

```powershell
mysql -u root -p kpi_ocb < "C:\Backup\kpi_ocb_YYYYMMDD.sql"
# lalu kembalikan folder storage, jalankan php artisan storage:link bila perlu
```

---

## 16. Troubleshooting Windows

| Gejala | Sebab / Solusi |
|--------|----------------|
| `ViteException: Unable to locate file in Vite manifest` | Asset belum di-build → `npm run build` di `C:\KPI OCB`. |
| Foto bukti tidak tampil (404 di `/storage/...`) | `php artisan storage:link` belum jalan / gagal symlink → jalankan terminal **As Administrator** atau aktifkan Developer Mode. |
| Perubahan `.env` tak berpengaruh | Cache config lama → `php artisan config:clear` lalu `config:cache`. |
| Skor KPI tidak pernah dihitung | Task Scheduler `KPI-OCB-Scheduler` mati / batch salah path → cek `storage\logs\schedule.log`. |
| Cek AI/parsing SOP macet | Queue worker mati → `nssm restart "KPI-OCB-Queue"`; cek `AI_TASK_CHECK_ENABLED` & API key; lihat `storage\logs\queue.log`. |
| "Anda belum absen hari ini" walau sudah absen | `users.absen_user_id` null atau DB `absen_management` tak reachable → §11. |
| `SQLSTATE... Unknown database 'absen_management'` | DB absensi belum diimpor / `DB_ABSEN_DATABASE` salah. |
| `Class 'GD'/'imagick' not found` saat upload | Aktifkan `extension=gd` di `php.ini`, reload Apache. |
| Error 500 tanpa detail | `APP_DEBUG=false` menyembunyikan detail — cek `storage\logs\laravel.log`. |
| Queue worker pakai kode lama setelah deploy | Belum restart service → langkah 6 §14. |
| Path error karena spasi `C:\KPI OCB` | Selalu bungkus path dengan tanda kutip `"..."`. |
| PHP bukan 8.4 | **Menu Laragon → PHP → Version → 8.4.x**, reload. |

Log viewer bawaan (superadmin) tersedia di `/log-viewer` untuk membaca `laravel.log` dari browser.

---

## 17. Checklist Go-Live

- [ ] PHP 8.4 aktif di Laragon + semua ekstensi menyala
- [ ] `C:\KPI OCB` berisi kode, `composer install --no-dev` sukses
- [ ] `npm run build` sukses (folder `public\build` ada)
- [ ] DB `kpi_ocb` dibuat + `migrate --force` + `db:seed --force` sukses
- [ ] DB `absen_management` reachable + user MySQL punya `SELECT`
- [ ] `absen_user_id` termapping (cek yang null)
- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` terisi, `APP_URL` benar
- [ ] `php artisan storage:link` sukses (foto tampil)
- [ ] Virtual host mengarah ke `C:\KPI OCB\public`, domain resolve
- [ ] HTTPS terpasang (produksi publik)
- [ ] Service **KPI-OCB-Queue** (NSSM) running + auto-start
- [ ] Task **KPI-OCB-Scheduler** aktif tiap 1 menit
- [ ] `config:cache` + `route:cache` + `view:cache` dijalankan
- [ ] Login superadmin awal + ganti password
- [ ] Uji: absen → generate task → upload bukti → cek AI keluar skor → isi laporan → skor 23:00
- [ ] Backup DB + storage terjadwal

---

*Untuk konsep sistem lihat `technical-documentation.md`; untuk pemakaian sehari-hari lihat `user-manual.md`.*
