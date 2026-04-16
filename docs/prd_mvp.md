Product Requirements Document (PRD)
Status: Draft v1.0

Tujuan: Memfasilitasi kolaborasi dan pelacakan tugas lintas departemen secara terpusat.

1. Struktur Organisasi & Hirarki

Aplikasi harus mendukung struktur tiga tingkat sebagai berikut:

Grouping Team Type: Kategori besar (HQ, Proyek, Teams).

Tim: Entitas spesifik di bawah kategori (Contoh: Tim Keuangan di bawah HQ).

Dashboard Tim: Ruang kerja khusus yang mencakup:

Overview: Ringkasan performa/statistik tim.

Tugas: Ruang kerja operasional utama.

2. Fitur Utama (Functional Requirements)

A. Manajemen Dashboard & Tugas

Fitur	Deskripsi
Papan Kanban	Visualisasi tugas dalam bentuk kolom (boards).
Header Dinamis	Admin dapat menambah, menghapus, atau mengubah nama kolom (Contoh: Menambah kolom "Pending").
Default Header	Sistem otomatis menyediakan: Backlog, In Progress, In Review, Done.
Drag and Drop	Pengguna dapat memindahkan kartu tugas antar kolom secara intuitif.
Modal Detail	Klik pada kartu tugas akan membuka jendela pop-up yang berisi rincian lengkap tugas.
B. Pengaturan Admin

Kemampuan untuk mengelola anggota di setiap tim.

Otoritas penuh untuk memodifikasi struktur kolom Kanban pada setiap tim yang dikelola.

3. Alur Pengguna (User Journey)

Navigasi: Pengguna memilih Grouping Type -> Memilih Tim -> Masuk ke Dashboard.

Manajemen Tugas: Pengguna melihat list tugas di Kanban -> Menyeret tugas ke kolom yang sesuai -> Mengklik tugas untuk melihat detail/update status.

Kustomisasi (Admin): Admin masuk ke pengaturan tugas -> Mengubah nama atau urutan header Kanban -> Perubahan tercermin pada Dashboard tim.

4. Spesifikasi Teknis & Antarmuka

Interaksi: Drag-and-drop yang mulus (smooth transition).

Komponen UI: * Sidebar untuk navigasi Grouping & Tim.

Top Bar untuk info Dashboard (Overview/Tugas).

Cards untuk representasi tugas yang mencakup judul dan informasi ringkas.

5. Rencana Pengembangan (Roadmap)

Fase 1: Pembuatan struktur database (Grouping, Tim, User).

Fase 2: Implementasi papan Kanban dengan header dinamis.

Fase 3: Fitur Drag and Drop & Modal Detail.

Fase 4: Dashboard Overview (Analitik sederhana).