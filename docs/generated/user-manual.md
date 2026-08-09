# Buku Panduan Pengguna — OCB KPI Management

**Aplikasi:** OCB KPI Management
**Untuk:** Seluruh pengguna (Staff, SPV, Manager, HR, Operasional, Gudang, Admin, CEO/Direktur)
**Zona waktu:** WITA (Asia/Makassar, UTC+8)
**Versi dokumen:** 2026-08-09

---

## Daftar Isi

1. [Pengenalan](#1-pengenalan)
2. [Memulai (Login & Akun)](#2-memulai-login--akun)
3. [Mengenal Tampilan Utama](#3-mengenal-tampilan-utama)
4. [Peran & Hak Akses](#4-peran--hak-akses)
5. [Bekerja dengan Tim](#5-bekerja-dengan-tim)
6. [Papan Kanban & Tugas](#6-papan-kanban--tugas)
7. [Komentar, Foto & Video (Bukti)](#7-komentar-foto--video-bukti)
8. [Dokumen & SOP](#8-dokumen--sop)
9. [Pengumuman & Pengingat](#9-pengumuman--pengingat)
10. [Chat Tim](#10-chat-tim)
11. [Sistem KPI — Untuk Pengguna yang Dinilai](#11-sistem-kpi--untuk-pengguna-yang-dinilai)
12. [Laporan Harian](#12-laporan-harian)
13. [Modul SPV (Kunjungan Toko)](#13-modul-spv-kunjungan-toko)
14. [Skor & Nilai (Harian, Mingguan, Bulanan)](#14-skor--nilai-harian-mingguan-bulanan)
15. [Panduan Manager / HR / Operasional](#15-panduan-manager--hr--operasional)
16. [Panduan CEO / Direktur](#16-panduan-ceo--direktur)
17. [Panduan Admin KPI](#17-panduan-admin-kpi)
18. [Feedback & Survei](#18-feedback--survei)
19. [Pengaturan Akun](#19-pengaturan-akun)
20. [Pertanyaan Umum (FAQ)](#20-pertanyaan-umum-faq)
21. [Istilah Penting](#21-istilah-penting)

---

## 1. Pengenalan

OCB KPI Management adalah aplikasi untuk **mengelola tugas tim** dan **menilai kinerja (KPI)** karyawan. Dengan aplikasi ini Anda bisa:

- Mengerjakan dan memantau tugas melalui papan Kanban.
- Mengunggah bukti pekerjaan (foto/video/komentar).
- Mengisi laporan harian sesuai posisi Anda.
- Melihat nilai KPI harian, mingguan, dan bulanan Anda.
- (Untuk atasan) Memantau, memverifikasi, dan memberi nilai bawahan.

Aplikasi berjalan di browser (komputer maupun HP). Semua perhitungan waktu KPI mengikuti **jam WITA**.

---

## 2. Memulai (Login & Akun)

### Masuk (Login)

1. Buka alamat aplikasi di browser.
2. Masukkan **Email** dan **Kata Sandi**.
3. Klik **Masuk / Log in**.

### Lupa kata sandi

1. Di halaman login, klik **Lupa kata sandi?**
2. Masukkan email Anda → klik kirim.
3. Buka email → klik tautan reset → buat kata sandi baru.

### Verifikasi email

Jika diminta memverifikasi email, buka email dari sistem dan klik tautan verifikasi. Bila belum menerima, klik **Kirim ulang tautan verifikasi**.

### Autentikasi Dua Faktor (2FA) — opsional

Untuk keamanan tambahan, Anda bisa mengaktifkan 2FA di **Pengaturan → Keamanan**:

1. Aktifkan Two-Factor Authentication.
2. Pindai kode QR dengan aplikasi seperti Google Authenticator.
3. Simpan **kode pemulihan (recovery codes)** di tempat aman.
4. Saat login berikutnya, Anda akan diminta kode 6 digit dari aplikasi authenticator.

> **Penting:** Simpan kode pemulihan. Jika HP hilang, kode pemulihan adalah satu-satunya cara masuk.

---

## 3. Mengenal Tampilan Utama

Setelah login Anda tiba di **Dashboard**. Elemen umum:

- **Menu / Sidebar** — navigasi ke Tim, area KPI, laporan, pengaturan (isi menu menyesuaikan peran Anda).
- **Dashboard** — ringkasan tugas, skor, dan tren terbaru.
- **Tombol Feedback (mengambang)** — selalu tampil di pojok layar untuk melapor bug / usulan kapan saja.

Menu yang muncul berbeda per pengguna: seorang Staff Gudang tidak melihat menu HR, dan sebaliknya. Ini normal — Anda hanya melihat area yang menjadi hak akses Anda.

---

## 4. Peran & Hak Akses

Sistem memakai **dua lapis** hak akses:

1. **Role sistem** — `superadmin`, `admin`, `member`. Menentukan hak global.
2. **Posisi (jabatan)** — mis. "Manager HR", "Gudang BJB", "SPV Unit 1", "Kurir". Menentukan **area KPI** (`hr`, `operational`, `gudang`, `spv`) yang bisa Anda buka.

### Peristilahan peran ↔ jabatan di aplikasi

Istilah umum yang mungkin Anda dengar di lapangan dipetakan ke jabatan/role nyata di aplikasi:

| Sebutan umum | Di aplikasi | Bisa lakukan apa |
|--------------|-------------|------------------|
| **Owner / Direktur** | Role `superadmin` + posisi "Direktur" | Akses penuh: semua area, CEO Monitoring, definisi KPI, feedback, survei |
| **HRD** | Posisi "Manager HR" (area `hr`, role `admin`) | Dashboard KPI HR, verifikasi tugas, Laporan CEO, pantau tim HR |
| **Manager** | "Manager Operasional" / "Manager Gudang" / "Manager HR" | Dashboard & verifikasi KPI area masing-masing, Laporan CEO |
| **Staff / Karyawan** | Gudang (BJB/BJM/ACC/Gesekan), Kurir, CS & Server, Tim IT, dll. | Kerjakan tugas KPI, unggah bukti, isi laporan harian, lihat skor sendiri |
| **SPV** | Posisi "SPV Unit 1" (area `spv`) | Semua hal Staff + pilih toko binaan, buat tugas kunjungan toko |
| **Trainer** | Masuk grup "Staff" (belum punya area KPI khusus) | Sama seperti Staff; area/tugas KPI menyesuaikan bila jabatan diberi `area_slug` + `has_kpi` |

> **Catatan:** "Owner", "HRD", dan "Trainer" bukan role/posisi tersendiri di database. Owner ≈ Direktur/superadmin, HRD ≈ Manager HR, Trainer default masuk grup Staff. Hak akses sebenarnya ditentukan oleh **posisi + role** yang di-set Admin.

### Ringkasan kemampuan per lapis

| Lapis | Yang bisa dilakukan |
|-------|---------------------|
| **Member (karyawan)** | Mengerjakan tugas, mengunggah bukti, mengisi laporan harian, melihat skor sendiri |
| **SPV** | Semua di atas + membuat tugas kunjungan toko, memilih toko binaan |
| **Manager / HR / Operasional / Gudang** | Memantau & memverifikasi tugas bawahan, mengisi Laporan CEO, melihat skor tim area-nya |
| **Admin** | Mengelola area sesuai posisinya + pengaturan tim/anggota |
| **Superadmin / Direktur (Owner)** | Akses penuh: seluruh area, definisi KPI, CEO Monitoring, feedback/survei |

Akses ditentukan oleh **posisi** Anda. Jika Anda merasa seharusnya bisa membuka suatu menu tetapi muncul pesan "tidak diizinkan", hubungi Admin untuk memeriksa posisi/area Anda.

---

## 5. Bekerja dengan Tim

### Membuka tim

1. Dari menu, pilih tim Anda.
2. Halaman tim memiliki beberapa **tab**:
   - **Overview** — ringkasan tim.
   - **Tugas** — papan Kanban tim.
   - **SOP** — langkah standar operasional.
   - **Dokumen** — berkas & folder.
   - **Chat** — obrolan tim.
   - **Pengumuman** — pengumuman & pengingat.
   - **Aktivitas** — riwayat perubahan.
   - **(SPV) Toko** — daftar toko binaan.

### Anggota tim (khusus Admin)

Admin dapat menambah/menghapus anggota lewat tab pengelolaan tim, dan mengatur peran anggota di dalam tim.

---

## 6. Papan Kanban & Tugas

### Membuat tugas

1. Buka tab **Tugas** pada tim.
2. Klik **+ Tambah Tugas** pada kolom yang diinginkan.
3. Isi **Judul**, **Deskripsi**, **tenggat (due date)**, penerima tugas (assignee), label/tag bila perlu.
4. Simpan.

### Memindahkan tugas

Seret (drag) kartu tugas dari satu kolom ke kolom lain untuk mengubah status (mis. "To Do" → "In Progress" → "Done"). Urutan kartu di dalam kolom juga bisa diseret.

### Membuka detail tugas

Klik kartu tugas untuk membuka **modal detail**: deskripsi, penerima, komentar, bukti (foto/video), dan tombol aksi.

### Kolom "Selesai"

Kolom yang ditandai **Done** menandakan tugas telah selesai. Untuk tugas KPI, memindahkan ke kolom selesai saja belum tentu memberi nilai penuh — bukti tetap diperlukan (lihat §11).

---

## 7. Komentar, Foto & Video (Bukti)

Komentar dipakai untuk diskusi **dan** untuk mengunggah bukti pekerjaan KPI.

### Menambahkan komentar

1. Buka detail tugas.
2. Ketik komentar di kotak komentar.
3. (Opsional) Lampirkan foto/video.
4. Kirim.

### Mengambil foto dengan kamera

Aplikasi memiliki **kamera bawaan**:

1. Klik ikon **kamera**.
2. Beri izin kamera bila diminta.
3. Ambil foto (bisa beberapa sekaligus). Gunakan tombol **putar kamera** untuk beralih kamera depan/belakang.
4. Tinjau → **ambil ulang** atau **konfirmasi**.
5. Kirim komentar beserta foto.

Jika perangkat tidak mendukung kamera langsung, aplikasi otomatis beralih ke **pemilih berkas** (galeri).

### Merekam video

Bila tugas mewajibkan video, kamera memiliki sakelar **Foto/Video** (maksimal 60 detik). Di iPhone/iOS, aplikasi memakai pemilih berkas video bila perekaman langsung tidak tersedia.

### Unggah dari galeri

Tombol unggah galeri/berkas muncul bila tugas mengizinkannya (diatur Admin melalui setelan tugas). Kamera **selalu** tersedia.

> **Tip bukti KPI:** Jika tugas mensyaratkan jumlah foto minimum, semua foto harus berada **dalam satu komentar**. Foto yang tersebar di beberapa komentar tidak dihitung.

---

## 8. Dokumen & SOP

### Menyimpan berkas

1. Buka tab **Dokumen** pada tim.
2. Buat **Folder**, unggah **Berkas**, atau buat **Halaman/Dokumen** teks.
3. Struktur folder bisa bertingkat (folder di dalam folder).

### SOP (Standar Operasional Prosedur)

Dokumen dapat ditandai sebagai **SOP**. SOP dapat diproses otomatis oleh sistem menjadi **langkah-langkah terstruktur**, yang lalu dapat dikaitkan dengan kolom Kanban dan dinilai berdasarkan bukti. Pemrosesan berjalan di latar belakang; status pemrosesan ditampilkan pada dokumen.

Komentar/bukti dapat dikaitkan ke **langkah SOP** tertentu untuk audit yang rapi.

---

## 9. Pengumuman & Pengingat

### Membuat pengumuman

1. Buka tab **Pengumuman**.
2. Klik **+ Pengumuman**, isi judul & isi, simpan.

### Pengumuman berulang (pengingat)

Saat membuat pengumuman, aktifkan **berulang** dan atur:
- Frekuensi (harian/mingguan/bulanan) & interval.
- Waktu, hari, atau tanggal.
- Batas berakhir (opsional).

Sistem otomatis memunculkan pengumuman pada jadwalnya. Anda cukup mengaturnya sekali.

### Berkomentar

Setiap anggota dapat mengomentari pengumuman.

---

## 10. Chat Tim

Tab **Chat** menyediakan obrolan waktu-nyata (real-time) per tim:

1. Buka tab **Chat**.
2. Ketik pesan, kirim.
3. Lampirkan berkas bila perlu; unduh lampiran dari orang lain melalui tautan.

Pesan muncul otomatis tanpa perlu memuat ulang halaman.

---

## 11. Sistem KPI — Untuk Pengguna yang Dinilai

Bagian ini untuk karyawan yang kinerjanya dinilai (Gudang, SPV, dll.).

### Alur harian

```
1. Anda ABSEN dulu (check-in) di sistem absensi
2. Buka Dashboard KPI → klik "Generate Task" untuk membuat tugas hari ini
3. Anda kerjakan tugas + unggah bukti (foto/komentar/video)
4. Atasan/verifikator (atau AI) memverifikasi tugas
5. Anda isi Laporan Harian sebelum batas waktu
6. Skor dihitung otomatis pukul 23:00 WITA
```

### Wajib absen dulu (Attendance Gate)

Tugas KPI **tidak lagi dibuat otomatis tengah malam**. Anda harus **absen (check-in) hari itu** sebelum bisa membuat tugas. Bila belum absen, tombol Generate Task menolak dengan pesan:

> *"Anda belum absen hari ini. Silakan absen terlebih dahulu sebelum generate task KPI."*

Alasannya: skor KPI diikat pada kehadiran nyata — tidak absen = tidak ada tugas = tidak ada skor untuk hari itu. Absensi diambil dari sistem absensi terpisah (mesin/aplikasi absen). Bila nama Anda belum terhubung ke data absen, hubungi Admin untuk memetakan `absen_user_id` Anda.

### Mendapatkan tugas KPI

- Setelah absen, buka **Dashboard KPI** Anda dan klik **Generate Task**.
- **SPV** harus memilih **toko binaan** terlebih dahulu sebelum tugas kunjungan dibuat (lihat §13).
- Tugas hanya bisa dibuat sekali per hari (per toko untuk SPV).

### Mengerjakan & mengunggah bukti

1. Buka **Dashboard KPI** → klik tugas untuk membuka detail.
2. Unggah bukti sesuai syarat tugas:
   - **Komentar + foto** → syarat dasar.
   - **Minimum foto** → mis. minimal 2 foto **dalam satu komentar**.
   - **Wajib video** → harus ada lampiran video.
3. Setelah syarat terpenuhi, tugas siap diverifikasi.

Beberapa tugas bertanda **auto-done**: otomatis dianggap selesai ketika Anda mengirim Laporan Harian, tanpa perlu bukti terpisah.

### Bobot & nilai

Setiap tugas punya **bobot** (%). Total bobot semua tugas dalam satu posisi = 100%. Kelengkapan bukti menentukan berapa persen bobot yang Anda peroleh:

| Bukti | Perolehan |
|-------|-----------|
| Lengkap (komentar + lampiran) | 100% bobot |
| Sebagian (komentar saja) | 30% bobot |
| Tidak ada | 0% |

Untuk tugas dengan definisi KPI, tabel di atas **digantikan oleh nilai AI**: sistem menilai seberapa sesuai bukti Anda dengan cara kerja & metode verifikasi tugas, skor 0–100, lulus ≥ 75 (lihat §14).

---

## 12. Laporan Harian

Laporan Harian wajib diisi oleh posisi tertentu setiap hari.

### Mengisi laporan

1. Dari menu KPI, klik **Laporan Harian** (atau **Kirim Laporan Harian**).
2. Isi kolom-kolom formulir (teks, angka, tanggal, atau pilihan) — kolom mengikuti template posisi Anda.
3. Kolom bertanda **wajib** harus diisi.
4. Klik **Kirim**.

### Aturan waktu (WITA)

- **Batas terlambat: 22:30 WITA.** Laporan setelah jam ini ditandai **TERLAMBAT**.
- **Batas akhir keras: 23:00 WITA.** Setelah jam ini laporan **tidak dapat** dikirim/diubah untuk hari itu.
- Laporan hanya untuk **hari ini**. Tanggal lampau bersifat **hanya-baca** (kecuali admin mengaktifkan mode backdate).

### Syarat kelayakan

Untuk mengirim laporan, minimal **80%** tugas KPI hari itu harus sudah selesai/terpenuhi. Selesaikan tugas dulu bila tombol kirim terkunci.

### Melihat & mengubah

- **Riwayat** — daftar laporan Anda yang sudah dikirim.
- Anda bisa **mengedit** laporan hari ini selama belum melewati batas 23:00 WITA.

---

## 13. Modul SPV (Kunjungan Toko)

Khusus pengguna **SPV** yang memantau toko.

### Memilih toko & membuat tugas

1. Buka **Dashboard KPI SPV**.
2. Pilih **toko binaan** dari daftar toko yang ditugaskan ke Anda.
3. Klik **Generate Task** — sistem membuat paket tugas KPI untuk kunjungan itu, dengan **tanggal kunjungan** (tenggat = H+1).

### Tujuan Kunjungan

Dashboard SPV menampilkan **banner "Tujuan Kunjungan"** berisi kode cabang (OC) + nama toko yang harus Anda kunjungi hari itu. Kartu tugas harian juga menampilkan toko tujuan.

### Laporan Kunjungan Harian

SPV mengisi **"Format Laporan Kunjungan Harian"** (13 bagian). Riwayat laporan menampilkan nama toko + kode cabang dari tugas KPI Anda pada tanggal tersebut.

### Membuat tugas kunjungan manual (dari halaman Tim)

Bila Anda perlu tugas kunjungan tambahan:
1. Dari papan tim, buka modal **buat tugas kunjungan toko**.
2. Pilih toko (admin melihat semua toko; SPV melihat toko binaannya).
3. Pilih **tanggal kunjungan** — tenggat otomatis H+1.
4. SPV toko otomatis menjadi penerima tugas. (Tugas kunjungan hanya bisa dibuat di kolom pertama.)

---

## 14. Skor & Nilai (Harian, Mingguan, Bulanan)

### Melihat skor

Menu KPI Anda punya sub-menu:
- **Harian** — skor per hari + rincian tugas.
- **Mingguan** — rata-rata 7 hari.
- **Bulanan** — rata-rata 4 minggu + bonus.

### Cara nilai dihitung

```
Skor Harian   = total bobot terpenuhi ÷ total bobot   → Grade
Skor Mingguan = rata-rata skor harian minggu itu
Skor Bulanan  = rata-rata 4 skor mingguan + bonus konsistensi
```

### Nilai AI (untuk tugas dengan definisi KPI)

Bila Anda mengirim bukti (komentar + foto), sistem AI menilai kesesuaian isi komentar dengan **cara kerja** & **cara verifikasi** tugas, lalu memberi **satu skor 0–100**:

- AI menilai langsung **0–100** (bukan lagi "dasar 70 + tambahan").
- **Lulus (diterima) bila skor ≥ 75** → tugas otomatis terverifikasi, bobot penuh.
- **Skor < 75** → ditolak; perbaiki komentar lalu submit ulang.
- Maksimal **3 kali percobaan**. Bila habis tanpa lulus, Anda dapat **nilai sebagian** = (skor terakhir ÷ 100) × bobot.
- AI diinstruksikan **longgar/murah hati** — bukti jelas & sesuai mudah meraih 90–100.
- Bila cek AI gagal karena kendala sistem (bukan salah Anda), percobaan **tidak dihitung** — cukup submit ulang.

### Tabel Grade

| Grade | Rentang | Tindak lanjut |
|-------|---------|---------------|
| **A+** | 95–100% | Reward / pertimbangan promosi |
| **A** | 85–94% | Sesuai target |
| **B** | 70–84% | Perlu perbaikan, coaching mingguan |
| **C** | 50–69% | Peringatan, SP1 + rencana 30 hari |
| **D** | <50% | Kritis, SP2/SP3 + evaluasi |

**Bonus konsistensi:** +5% pada nilai bulanan bila **tidak ada** grade D sepanjang bulan.

---

## 15. Panduan Manager / HR / Operasional

### Dashboard area

Buka dashboard area Anda (mis. **HR → Dashboard KPI** atau **Operasional → Dashboard KPI**). Anda melihat kartu skor, tren, dan panel tim.

### Memverifikasi tugas bawahan

1. Buka tugas yang menunggu verifikasi.
2. Periksa bukti (foto/video/komentar).
3. Klik **Verifikasi** bila bukti memadai. Tugas terkunci sebagai terverifikasi (Anda tetap bisa menambah komentar setelahnya).

### Panel SPV (per SPV)

Dashboard HR & Operasional mengelompokkan panel SPV menjadi kartu ringkas **satu baris per SPV** (nama, tim, tujuan kunjungan, lencana `terverifikasi/total`). Klik kartu → daftar tugas SPV itu → klik tugas → detail lengkap.

Panel juga dipisah dua kartu berdasarkan asal tugas:
- **Task KPI SPV** — dibuat dari definisi KPI.
- **Task Kanban Teams** — dibuat manual dari halaman Tim.

### Laporan CEO (Laporan Harian Manager)

Manager mengisi **Laporan CEO** harian melalui menu **Laporan CEO / Laporan Harian**. Aturan waktu sama: terlambat setelah 22:30 WITA, tertutup setelah 23:00 WITA.

---

## 16. Panduan CEO / Direktur

Menu **CEO Monitoring** (khusus superadmin) berisi:

- **Dashboard** (`/kpi/ceo/dashboard`) — skor harian seluruh organisasi.
- **Laporan Harian** (`/kpi/ceo/daily-reports`) — laporan yang masuk & yang belum.
- **Alerts** (`/kpi/ceo/alerts`) — peringatan kritis (mis. grade rendah).
- **SPV Monitor** (`/kpi/ceo/spv`) — pemantauan tugas SPV; klik tugas untuk melihat komentar & foto (dengan thumbnail).
- **Detail Pengguna** (`/kpi/ceo/user/{user}`) — rincian per karyawan.

### Membuka & menutup Survei

CEO dapat **membuka** siklus survei agar semua pengguna mengisi umpan balik menyeluruh, lalu **menutupnya** saat selesai (lihat §18).

---

## 17. Panduan Admin KPI

Menu **Admin KPI** (superadmin) untuk mengatur sistem penilaian tanpa mengubah kode.

### Definisi Tugas KPI (`/kpi/admin/definitions`)

- **Tambah/ubah/hapus** template tugas per posisi.
- Atur **bobot** tiap tugas — **total per posisi harus 100%**.
- Sakelar per tugas:
  - **Upload Proof** — tampilkan tombol unggah galeri (kamera selalu ada).
  - **Auto-Done on Report** — tugas otomatis selesai saat laporan harian dikirim (total bobot auto-done dibatasi maks. 10% per posisi).
  - **Require Video** — verifikasi terkunci sampai ada lampiran video.
  - **Minimum Photos** — jumlah foto minimum **dalam satu komentar** (default 1).

### Kolom Laporan (`/kpi/admin/report-fields`)

Kelola kolom Laporan Harian per posisi: kunci kolom, label, tipe (teks, textarea, angka, tanggal, pilihan), grup, urutan, wajib/tidak, dan opsi dropdown. Perubahan langsung berlaku tanpa perlu edit seeder.

### Skor (`/kpi/admin/scores`)

Melihat rekap skor seluruh posisi.

---

## 18. Feedback & Survei

### Feedback cepat

Klik **tombol Feedback mengambang** (selalu tampil) kapan saja untuk melapor:
- Bug / kendala,
- Permintaan fitur,
- Saran.

### Survei

Saat CEO membuka **siklus survei**, Anda akan diminta mengisi survei lengkap (penilaian pengalaman, durasi pemakaian, preferensi fitur, kendala teknis, usulan fitur). **Satu kali per siklus.**

### Admin feedback

Admin membuka **Admin Feedback** untuk melihat semua masukan (cepat + survei), mengelola siklus, dan **mengekspor ke Excel (.xlsx)**.

---

## 19. Pengaturan Akun

Buka **Pengaturan** (ikon profil / menu):

- **Profil** — ubah nama, email, dan **foto profil (avatar)**.
- **Keamanan** — ubah kata sandi, kelola **2FA**.
- **Tampilan (Appearance)** — mode terang/gelap.

---

## 20. Pertanyaan Umum (FAQ)

**T: Tugas KPI saya belum muncul hari ini.**
J: Tugas tidak dibuat otomatis. **Absen (check-in) dulu**, lalu klik **Generate Task** di dashboard KPI. SPV: pastikan sudah memilih toko binaan.

**T: Muncul pesan "Anda belum absen hari ini".**
J: Sistem hanya membuat tugas KPI bagi yang sudah absen hari itu. Absen dulu di sistem absensi. Bila sudah absen tapi tetap tertolak, nama Anda mungkin belum terhubung ke data absen — hubungi Admin.

**T: Tombol Kirim Laporan terkunci.**
J: Minimal 80% tugas KPI hari itu harus selesai. Selesaikan bukti tugas dulu.

**T: Laporan saya ditandai TERLAMBAT.**
J: Dikirim setelah 22:30 WITA. Setelah 23:00 WITA laporan tidak bisa dikirim sama sekali untuk hari itu.

**T: Foto saya banyak tapi tugas tetap belum memenuhi minimum.**
J: Semua foto harus **dalam satu komentar**. Kumpulkan foto pada satu komentar, jangan terpisah.

**T: Nilai AI saya rendah walau ada foto.**
J: AI menilai **kesesuaian isi** komentar dengan cara kerja tugas. Tulis komentar yang menjelaskan apa yang dikerjakan sesuai metode verifikasi.

**T: Saya tidak bisa membuka menu tertentu.**
J: Menu dibatasi oleh posisi Anda. Hubungi Admin untuk memeriksa posisi/hak akses.

**T: Perubahan tidak muncul di layar.**
J: Muat ulang halaman. Bila masih, laporkan ke Admin (kemungkinan aset perlu di-build ulang).

**T: HP saya hilang dan 2FA aktif.**
J: Gunakan **kode pemulihan** yang disimpan saat mengaktifkan 2FA. Bila tidak ada, hubungi Admin.

---

## 21. Istilah Penting

| Istilah | Arti |
|---------|------|
| **KPI** | Key Performance Indicator — ukuran kinerja |
| **WITA** | Waktu Indonesia Tengah (UTC+8) — acuan seluruh jadwal KPI |
| **Bobot (weight)** | Persentase kepentingan sebuah tugas (total 100% per posisi) |
| **Bukti (evidence)** | Komentar + foto/video yang membuktikan tugas dikerjakan |
| **Verifikasi** | Persetujuan atasan bahwa bukti tugas memadai |
| **Grade** | Nilai huruf A+ s.d. D berdasarkan persentase skor |
| **Auto-Done** | Tugas otomatis selesai saat laporan harian dikirim |
| **SOP** | Standar Operasional Prosedur; bisa dipecah menjadi langkah terstruktur |
| **SPV** | Supervisor; memantau toko binaan |
| **OC / Kode Cabang** | Kode toko/cabang (mis. OC1–OC40) |
| **Backdate** | Mengisi laporan untuk tanggal lampau (hanya bila diaktifkan admin) |
| **TERLAMBAT** | Penanda laporan yang dikirim setelah 22:30 WITA |

---

*Butuh bantuan lebih lanjut? Gunakan tombol **Feedback** di dalam aplikasi atau hubungi Admin/CEO organisasi Anda.*
