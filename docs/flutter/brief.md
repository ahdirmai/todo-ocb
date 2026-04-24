# Flutter Mobile App Brief

## Ringkasan

Dokumen ini adalah brief komprehensif untuk pengembangan aplikasi mobile `todo-app-v2` menggunakan Flutter sebagai satu codebase untuk iOS dan Android.

Tujuan utamanya adalah menghadirkan pengalaman mobile yang cepat, stabil, dan fokus pada eksekusi kerja lapangan: melihat prioritas, mengelola task, membaca pengumuman, mengakses dokumen, berkomunikasi di tim, dan merespons pekerjaan secara real-time tanpa harus membuka web desktop.

Dokumen ini disusun berdasarkan implementasi aplikasi Laravel yang sudah ada saat ini, terutama modul:

- Dashboard berbasis role
- Team workspace
- Kanban task management
- Task detail, assignee, tag, attachment, comment
- Team chat
- Announcement dan recurring announcement
- Document & file workspace
- Activity log
- Team/member management

## Tujuan Produk

### Tujuan bisnis

- Memperluas penggunaan aplikasi ke konteks mobile-first.
- Mempermudah anggota tim lapangan atau manajer untuk memantau dan menindaklanjuti pekerjaan tanpa laptop.
- Mengurangi friksi untuk update status, komentar, upload lampiran, dan komunikasi tim.
- Meningkatkan kecepatan respon terhadap task deadline, announcement penting, dan percakapan tim.

### Tujuan pengguna

- Melihat daftar tim dan prioritas personal dengan cepat.
- Membuka task dari notifikasi dan langsung melakukan aksi.
- Memindahkan task antar kolom, mengubah assignee/tag/deadline, dan menambah komentar/lampiran.
- Membaca dan menanggapi announcement.
- Mengakses dokumen, SOP, dan file penting dari ponsel.
- Mengikuti percakapan tim secara real-time.

## Platform & Stack

### Platform target

- iOS
- Android

### Framework utama

- Flutter untuk satu codebase mobile lintas platform

### Backend existing

- Laravel 13
- Inertia + React untuk web
- Fortify untuk auth web
- Spatie Media Library untuk attachment/media
- Role & permission via Spatie Permission

## Keputusan Sinkronisasi dengan API Contract

Dokumen ini harus dibaca bersama [docs/api-contract/api.md](/Users/ahdirmai/Herd/todo-app-v2/docs/api-contract/api.md).

Aturan sinkronisasinya:

- Brief ini mendefinisikan kebutuhan produk, prioritas, dan delivery plan mobile.
- `api.md` menjadi source of truth untuk surface API mobile, request/response, auth, dan aturan integrasi FE-BE.
- Bila ada konflik, kontrak teknis di `api.md` menang untuk detail endpoint, sementara brief ini menang untuk prioritas produk dan urutan delivery.
- Flutter app tidak boleh mengandalkan web route Inertia sebagai integrasi jangka panjang.
- Mobile target API yang disepakati menggunakan namespace `api/v1`.
- Auth mobile target yang disepakati adalah bearer token berbasis Laravel Sanctum.
- Semua endpoint write mobile harus mengembalikan JSON eksplisit, bukan `back()` redirect style.

## Prinsip Implementasi Mobile

- Mobile bukan sekadar port dari web. UI harus dioptimalkan untuk tugas cepat, navigasi dangkal, dan akses satu tangan.
- Fokus utama adalah use case operasional harian, bukan semua fitur admin desktop pada fase awal.
- Arsitektur Flutter harus mudah diskalakan dan testable.
- API contract harus stabil, eksplisit, dan versionable.
- Dukungan offline minimal harus dipikirkan sejak awal, walaupun implementasi penuh bisa bertahap.

## Rekomendasi Arsitektur Flutter

Berdasarkan panduan arsitektur resmi Flutter, arsitektur mobile sebaiknya memakai pembagian yang jelas antara `views`, `view models`, `repositories`, dan `services`.

### Struktur layer yang direkomendasikan

- `presentation`
  - screens/pages
  - widgets
  - view_models
  - navigation
- `domain`
  - entities
  - use_cases bila dibutuhkan
- `data`
  - repositories
  - remote data sources
  - local cache data sources
  - DTO / serializers
- `core`
  - networking
  - auth/session
  - config
  - error handling
  - logging
  - utilities

### Prinsip state management

- Gunakan pola yang mendukung separation of concerns dan testing.
- ViewModel memegang state screen.
- Repository menjadi single source of truth untuk akses remote/local.
- Networking, auth token handling, dan file upload dipusatkan di layer service.

### Prinsip navigasi

- Shell/tab navigation untuk area utama.
- Deep link untuk membuka task, announcement, document, atau team tertentu dari notifikasi.
- Route param harus konsisten dengan entity ID server.

## Scope Produk

## Fase 1: MVP mobile

Fase ini adalah target minimum yang cukup kuat untuk dipakai tim harian.

### 1. Authentication

- Login via email + password
- Persist session/token
- Logout
- Fetch current user profile
- Fetch daftar team milik user yang sedang login

### 2. Dashboard

- Dashboard personal/member
- Dashboard admin ringkas
- Quick insight: assigned tasks, overdue, due soon, recent activity
- Deep link ke task atau team

### 3. Team listing

- List team yang user punya akses
- Search team
- Team detail ringkas
- Team context snapshot

### 4. Team workspace

Tab mobile yang direkomendasikan:

- Overview
- Tasks
- Chat
- Announcements
- Documents

Activity log bisa masuk fase 1.5 atau role-based.

### 5. Task management

- Lihat board/kanban per team
- Lihat daftar task per column
- Buka task detail
- Create task
- Update task title/description/due date
- Assign/unassign anggota
- Set/remove tag
- Upload attachment
- Delete task jika berwenang
- Move task antar column
- Reorder task dalam column
- Comment dan reply

### 6. Team chat

- List pesan
- Kirim pesan teks
- Kirim lampiran
- Tampilkan realtime message

### 7. Announcement

- List announcement
- Announcement detail
- Create announcement
- Update announcement
- Delete announcement
- Comment/reply
- Tampilkan recurring announcement sebagai read-only pada fase awal, pengaturan recurrence bisa diaktifkan hanya untuk role tertentu

### 8. Documents & files

- List folder / document / file
- Browse by parent folder
- Breadcrumb
- Document detail
- Create folder
- Upload file
- Create rich document
- Update document
- Delete document
- Comment/reply pada document bila ingin parity dengan web

### 9. Profile

- Current user info
- Avatar
- Position
- Role display

## Baseline API MVP yang Harus Ada

Daftar ini sengaja disamakan dengan `docs/api-contract/api.md` dan menjadi minimum backend surface agar MVP Flutter bisa dibangun dengan rapi.

### Auth & session

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/me/teams`

### Dashboard & team context

- `GET /api/v1/dashboard`
- `GET /api/v1/teams/{team}/context`
- `GET /api/v1/teams/{team}/kanbans`

### Tasks

- `GET /api/v1/teams/{team}/tasks`
- `GET /api/v1/tasks/{task}`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{task}`
- `DELETE /api/v1/tasks/{task}`
- `POST /api/v1/kanbans/tasks/reorder`

### Task comments

- `POST /api/v1/tasks/{task}/comments`
- `PATCH /api/v1/comments/{comment}`
- `DELETE /api/v1/comments/{comment}`

### Chat

- `GET /api/v1/teams/{team}/messages`
- `POST /api/v1/teams/{team}/messages`

### Announcements

- `GET /api/v1/teams/{team}/announcements`
- `GET /api/v1/announcements/{announcement}`
- `POST /api/v1/teams/{team}/announcements`
- `PATCH /api/v1/announcements/{announcement}`
- `DELETE /api/v1/announcements/{announcement}`

### Documents

- `GET /api/v1/teams/{team}/documents`
- `GET /api/v1/documents/{document}`
- `POST /api/v1/teams/{team}/documents/folders`
- `POST /api/v1/teams/{team}/documents/files`
- `POST /api/v1/teams/{team}/documents/pages`
- `PATCH /api/v1/teams/{team}/documents/{document}`
- `DELETE /api/v1/teams/{team}/documents/{document}`

### Supporting lookup

- `GET /api/v1/tags`

## Fase 2

- Push notification
- Offline cache yang lebih matang
- Draft queue untuk write action
- Mention-aware composer
- Search global lintas team
- Recurring announcement management yang lengkap
- Download center / attachment manager
- Better role-based admin flows

## Fase 3

- Background sync
- Read/unread tracking
- Saved filters
- Analytics lebih dalam
- Team/member administration penuh dari mobile

## Fitur Prioritas Tinggi

Prioritas paling tinggi untuk mobile pertama:

1. Auth
2. Dashboard
3. Team list
4. Kanban + task detail
5. Comments + attachments
6. Chat
7. Announcements
8. Documents

## Persona Pengguna

### Member

Butuh melihat pekerjaan pribadi, due soon, update progres, dan merespons komentar/pesan dengan cepat.

### Team Admin

Butuh memantau tim, memindahkan task, mengelola workload, membuat announcement, dan menjaga dokumentasi tetap rapi.

### Superadmin/Admin global

Lebih banyak diprioritaskan di desktop, tetapi mobile tetap perlu memberi visibilitas ringkas terhadap dashboard, team health, dan item penting.

## User Journey Utama

### Journey 1: Login lalu lanjut kerja

1. User login
2. App memuat current user dan daftar team
3. App masuk ke dashboard personal
4. User melihat overdue dan due soon
5. User membuka task dari dashboard
6. User update status, komentar, atau lampiran

### Journey 2: Aksi cepat dari notifikasi

1. User menerima push notification task/announcement/chat
2. Tap notifikasi membuka deep link ke entity terkait
3. App resolve auth/session
4. Screen detail dibuka
5. User memberi respons langsung

### Journey 3: Kerja dari team workspace

1. User membuka team
2. User pindah ke tab task/chat/announcement/document
3. User mengelola item sesuai konteks tim

## Informasi Domain Penting dari Backend Saat Ini

### Team

- `id` UUID
- `slug`
- `grouping`: `hq`, `team`, `project`
- `is_active`

### Task

- `id` UUID
- `team_id`
- `kanban_column_id`
- `title`
- `description`
- `due_date`
- `order_position`
- `creator_id`
- relasi: assignees, tags, comments, attachments

### Kanban

- Team bisa punya kanban
- Column memiliki `title`, `order`, `is_default`

### Document

- `type`: `folder`, `document`, `file`
- support parent-child
- support `is_sop`
- support media attachment

### Announcement

- `title`
- `content`
- optional recurring rules
- support attachment dan comment

### Team Message

- `body`
- attachments
- broadcast realtime

## Requirement Fungsional

### Authentication & Session

- User bisa login dengan kredensial valid.
- User bisa tetap login setelah app ditutup.
- App bisa refresh state auth saat app dibuka lagi.
- Unauthorized session harus ditangani dengan redirect ke login.

### Authorization

Mobile wajib mengikuti policy backend yang sudah ada:

- Global admin / superadmin punya akses luas
- Task creator bisa update/delete task tertentu
- Team admin punya hak administratif di team
- Assignee dapat update task, tetapi tidak otomatis boleh delete

UI mobile harus menghormati capability ini dan tidak menampilkan aksi yang tidak boleh dilakukan.

### Attachment handling

Saat ini konfigurasi upload dokumen:

- max file size: `20480 KB` per file
- max attachment count untuk beberapa flow: `5`
- allowed mimes dokumen: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `png`, `jpg`, `jpeg`, `webp`

Mobile perlu:

- validasi ukuran sebelum upload
- menampilkan progress upload
- menampilkan error upload yang jelas

## Requirement Non-Fungsional

### Performance

- First meaningful content harus cepat di jaringan normal.
- Screen list harus bisa menampilkan skeleton/loading states.
- Infinite scroll atau pagination perlu konsisten.

### Reliability

- Write actions harus idempotent jika memungkinkan.
- App harus tangguh saat koneksi buruk.
- Error server dan validation error harus punya mapping yang jelas di UI.

### Security

- Token/session disimpan aman
- Attachment download menggunakan URL yang valid dan aman
- Role dan permission tidak boleh hanya diandalkan dari FE

### Observability

- Logging error client
- Network trace untuk request penting
- Crash reporting
- Analytics event untuk screen utama dan aksi penting

## Rekomendasi UX Mobile

### Navigasi utama

Pilihan paling masuk akal:

- Bottom navigation untuk:
  - Home
  - Teams
  - Inbox atau Activity
  - Profile

Lalu team workspace menjadi screen dengan tab internal:

- Overview
- Tasks
- Chat
- Announcements
- Documents

### Task UX

- Board view horizontal untuk tablet/landscape
- Alternatif list by column untuk ponsel kecil
- Detail task dibuka sebagai full screen page, bukan modal desktop-style
- Quick actions: ubah status, assign, due date, komentar

### Chat UX

- Composer sticky di bawah
- Attachment preview
- Realtime insert message baru
- Grouping message by sender/time

### Documents UX

- Folder browser style
- Empty state yang jelas
- Preview file bila memungkinkan
- SOP diberi badge visual khusus

## Offline & Sync Strategy

Rekomendasi realistis:

### Fase awal

- Cache read-only untuk:
  - current user
  - team list
  - dashboard snapshot
  - task summaries
  - announcements
  - documents metadata

- Write action tetap online-only

### Fase berikutnya

- Queue aksi write saat offline:
  - komentar
  - update task ringan
  - create chat draft

- Background sync saat koneksi kembali

## Realtime Strategy

Fitur yang sebaiknya realtime:

- team chat
- task comments jika dibuka di detail task
- announcement comments jika diperlukan
- possibly task board refresh ringan

Di backend saat ini sudah ada event broadcast untuk team message. Mobile perlu memakai kanal realtime yang konsisten dengan konfigurasi backend Laravel broadcasting.

## Notification Strategy

### Push notification target

- Task assigned
- Task due soon / overdue reminder
- New comment on followed task
- New announcement
- New chat mention atau chat penting

### Deep link target

- `/task/{id}`
- `/announcement/{id}`
- `/document/{id}`
- `/team/{id}`

## API Strategy

### Kondisi saat ini

Saat ini `/api` baru menyediakan read endpoints untuk:

- teams
- team context
- digest
- members
- kanbans
- tasks
- documents
- announcements
- messages
- activity logs
- search
- entity map
- resolve references

Flow create/update/delete masih dominan berada di web routes dan controller Inertia.

### Implikasi untuk mobile

Agar Flutter app maintainable, backend perlu menyediakan API mobile yang resmi untuk:

- auth mobile
- current user
- CRUD task
- task comments
- team chat write
- announcement CRUD
- document CRUD
- file upload
- member/team operations yang memang ingin dibuka di mobile

Referensi kontrak detail ada di [docs/api-contract/api.md](/Users/ahdirmai/Herd/todo-app-v2/docs/api-contract/api.md).

### Konvensi kontrak yang harus diikuti Flutter

- Gunakan `Authorization: Bearer {token}` untuk endpoint private.
- Gunakan JSON untuk request normal dan `multipart/form-data` untuk upload.
- Anggap `snake_case` sebagai naming resmi payload.
- Anggap `UUID` sebagai identifier utama untuk team/task/document/announcement/comment/message/kanban/column.
- Prioritaskan field tanggal ISO 8601 pada endpoint mobile target; field human-readable hanya pelengkap.

## Rencana Delivery

### Sprint 0

- Finalisasi API contract
- Putuskan auth mobile
- Tentukan pola realtime
- Tentukan strategy local cache
- Siapkan design system mobile

### Sprint 1

- Auth
- App shell
- Team list
- Dashboard
- Current user session

### Sprint 2

- Team overview
- Kanban board read
- Task detail read
- Comment read/write

### Sprint 3

- Task CRUD
- Move/reorder task
- Upload attachment
- Tag/assignee flows

### Sprint 4

- Chat
- Announcements
- Notification plumbing

### Sprint 5

- Documents & files
- SOP flows
- QA hardening

## Testing Strategy

### Flutter

- Unit test untuk repository, serializer, dan view model
- Widget test untuk screen penting
- Integration test untuk auth, team navigation, task update, chat send

### Backend

- Feature test untuk endpoint API mobile
- Authorization test untuk role-sensitive action
- Upload validation test
- Contract snapshot test untuk resource JSON penting

## Risiko Utama

### 1. API mobile belum lengkap

Saat ini read API sudah ada, tetapi write API belum menjadi surface resmi `/api`.

Mitigasi:

- sepakati kontrak lebih dulu
- bangun endpoint mobile secara bertahap
- jangan biarkan Flutter memakai web route Inertia sebagai integrasi jangka panjang

### 2. Auth mobile belum siap

Fortify saat ini melayani auth web. Mobile butuh token/session contract tersendiri.

Mitigasi:

- tambahkan auth mobile berbasis Sanctum token
- sediakan endpoint `me`, login, logout, revoke device token

### 3. Attachment flows kompleks

Task, comment, announcement, document, dan chat semuanya punya attachment.

Mitigasi:

- satukan aturan upload
- standardisasi format media response
- standardisasi multipart contract

### 4. Realtime beda perilaku antar platform

Mitigasi:

- tentukan event yang benar-benar wajib realtime
- sediakan fallback polling pada screen tertentu

## Keputusan Produk yang Disarankan

- Mobile fokus pada operasional harian, bukan seluruh admin suite desktop.
- Build API mobile resmi di `/api/v1`.
- Gunakan auth token khusus mobile.
- Pertahankan response envelope dan field naming konsisten.
- Pisahkan clearly antara endpoint yang sudah ada dan endpoint target.
- Rancang screen mobile dengan prioritas aksi cepat, bukan parity visual terhadap desktop.

## Output yang Diharapkan dari Brief Ini

Setelah brief ini disepakati, tim seharusnya bisa langsung membuat:

- mobile PRD turunan per fitur
- navigation map
- API implementation backlog backend
- Flutter module breakdown
- QA checklist
- delivery milestone per sprint

## Referensi

- Flutter app architecture guide: [https://docs.flutter.dev/app-architecture](https://docs.flutter.dev/app-architecture)
- Flutter architecture guide detail: [https://docs.flutter.dev/app-architecture/guide](https://docs.flutter.dev/app-architecture/guide)
- Flutter offline-first guidance: [https://docs.flutter.dev/app-architecture/design-patterns/offline-first](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)
- Flutter networking/authenticated requests: [https://docs.flutter.dev/cookbook/networking/authenticated-requests](https://docs.flutter.dev/cookbook/networking/authenticated-requests)
- Laravel Sanctum mobile authentication: [https://laravel.com/docs/13.x/sanctum](https://laravel.com/docs/13.x/sanctum)
