# Progress Development — Todo App v2

> Sesi: 16 April 2026 | Commit: `398ea7c`

---

## Ringkasan Singkat

Sesi ini membangun sistem manajemen proyek berbasis **Kanban** di atas Laravel 13 + Inertia.js v3 + React 19 + TailwindCSS v4. Fokus utama:
1. Migrasi seluruh primary key ke **UUID**
2. Arsitektur routing berbasis **URL path** (bukan query param)
3. Kanban board dengan **inline CRUD** kolom dan task
4. Sistem **RBAC lengkap** menggunakan Spatie Permission

---

## Stack Teknologi

| Layer      | Teknologi                                                |
|------------|----------------------------------------------------------|
| Backend    | PHP 8.4, Laravel 13, Inertia Laravel v3                  |
| Frontend   | React 19, Inertia React v3, TailwindCSS v4               |
| Auth       | Laravel Fortify                                          |
| RBAC       | Spatie Laravel Permission                                |
| Media      | Spatie Media Library                                     |
| Routing FE | Laravel Wayfinder (type-safe route functions)            |
| Database   | SQLite (dev)                                             |

---

## Fitur yang Diimplementasikan

### 1. 🗄️ Migrasi Database ke UUID

Semua tabel utama dikonversi dari auto-increment integer ke UUID:

| Tabel              | Primary Key | Foreign Keys (UUID)         |
|--------------------|-------------|-----------------------------|
| `teams`            | `uuid`      | —                           |
| `kanbans`          | `uuid`      | `team_id`                   |
| `kanban_columns`   | `uuid`      | `kanban_id`                 |
| `tasks`            | `uuid`      | `kanban_column_id`, `team_id` |
| `task_labels`      | `uuid`      | `task_id`                   |
| `comments`         | `uuid`      | `task_id`                   |
| `team_user`        | —           | `team_id` (uuid)            |
| `tags`             | `uuid`      | —                           |
| `task_tag`         | —           | `task_id`, `tag_id` (uuid)  |

Semua model ditambahkan trait `HasUuids` dari Eloquent.

---

### 2. 🔀 URL-Based Tab Routing

**Sebelum:** `/teams/hr-recruitment?tab=task`  
**Sekarang:** `/teams/hr-recruitment/task`

**Route Definition:**
```php
Route::get('teams/{team:slug}/{tab?}/{item?}', [TeamController::class, 'show'])
    ->where('tab', 'overview|task|chat|announcement|question|document')
    ->name('teams.show');
```

**`TeamController::show()`** melakukan selective loading relasi sesuai tab aktif (efisien, tidak load semua data setiap request).

**Frontend** menggunakan `router.visit()` Inertia untuk navigasi tab tanpa reload halaman.

---

### 3. 📋 Kanban Board — Komponen

#### Struktur Komponen
```
resources/js/components/kanban/
├── kanban-board.tsx      ← DnD context, add column, modal state
├── kanban-column.tsx     ← Inline edit/rename, delete, add task
├── kanban-card.tsx       ← Tag + Title + Avatar (simplified)
└── task-detail-modal.tsx ← Modal detail task + tag picker
```

#### `kanban-board.tsx`
- Drag & Drop menggunakan `@hello-pangea/dnd`
- **Add Column** — inline form di ujung board
- Mengelola state `selectedTask` dan `modalOpen` secara terpusat

#### `kanban-column.tsx`
- **Inline Rename** — klik ⋯ → Rename → edit langsung di header
- **Delete Column** — dengan konfirmasi
- **Add Card** — inline form di bawah setiap kolom
- Setelah task berhasil dibuat → otomatis buka **Task Detail Modal**

#### `kanban-card.tsx`
- Hanya tampilkan: **Tag** (badge berwarna) + **Title** + **Avatar** contributors
- Klik card → buka Task Detail Modal

#### `task-detail-modal.tsx`
- Pick **multi-tag** dari master list global (shared via Inertia)
- Edit **Title**, **Deskripsi**, **Tenggat Waktu**
- Tombol **Simpan** + **Hapus Task**

---

### 4. 🔐 RBAC — Spatie Permission

#### Roles & Permissions

| Permission          | Superadmin | Admin | Member |
|---------------------|:----------:|:-----:|:------:|
| viewAny member      | ✅         | ✅    | ❌     |
| create member       | ✅         | ✅    | ❌     |
| update member       | ✅         | ✅    | ❌     |
| delete member       | ✅         | ✅    | ❌     |
| assign role         | ✅         | ✅    | ❌     |
| viewAny tag         | ✅         | ✅    | ❌     |
| create/update/delete tag | ✅   | ✅    | ❌     |
| create task         | ✅         | ✅    | ✅     |
| update task         | ✅         | ✅    | ✅     |
| delete task         | ✅         | ✅    | ✅     |
| update/delete any task | ✅     | ✅    | ❌     |
| create/update/delete column | ✅ | ✅   | ❌     |

#### Registrasi Middleware (Laravel 11)
```php
// bootstrap/app.php
$middleware->alias([
    'role'               => \Spatie\Permission\Middleware\RoleMiddleware::class,
    'permission'         => \Spatie\Permission\Middleware\PermissionMiddleware::class,
    'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
]);
```

#### Demo Users (setelah `migrate:fresh --seed`)
| Email                      | Password   | Role        |
|----------------------------|------------|-------------|
| superadmin@example.com     | password   | superadmin  |
| admin@example.com          | password   | admin       |
| member@example.com         | password   | member      |

---

### 5. 🏷️ Global Tag Management

**Model:** `Tag` (uuid, name, color, created_by)  
**Pivot:** `task_tag` (task_id uuid, tag_id uuid)

- Tag bersifat **global** (satu daftar untuk semua tim)
- Di-share ke semua halaman via `HandleInertiaRequests::share()` sebagai `tags`
- CRUD Tag hanya untuk **Superadmin & Admin** (`/tags`)

---

### 6. 📚 Halaman Admin

#### `/members` — Manajemen Anggota  
- Tabel daftar semua user + role badge
- Modal **Invite Anggota Baru** (nama, email, password, pilih role)
- Modal **Ubah Role** individual
- Hapus anggota (tidak bisa hapus diri sendiri)

#### `/tags` — Manajemen Tag
- Grid tag dengan color swatch
- Modal **Buat/Edit Tag** dengan color picker 10 warna preset
- Live preview badge tag sebelum disimpan
- Hapus dengan konfirmasi

---

### 7. 🧭 Sidebar Kondisional

Menu **"Administrasi"** (Manajemen Anggota + Manajemen Tag) hanya muncul di sidebar jika user memiliki role `superadmin` atau `admin`.

```tsx
// app-sidebar.tsx
const isAdmin = auth?.roles?.includes('superadmin') || auth?.roles?.includes('admin');
{isAdmin && <SidebarGroup>...</SidebarGroup>}
```

---

## Arsitektur Backend — Controllers

| Controller              | Routes                            | Proteksi           |
|-------------------------|-----------------------------------|--------------------|
| `TeamController`        | `GET /teams/{slug}/{tab?}/{item?}`| auth               |
| `KanbanColumnController`| POST/PUT/DELETE `/kanbans/...`   | auth               |
| `KanbanBoardController` | PUT reorder columns/tasks         | auth               |
| `TaskController`        | CRUD `/tasks`                     | auth               |
| `MemberController`      | CRUD `/members`                   | role:superadmin\|admin |
| `TagController`         | CRUD `/tags`                      | role:superadmin\|admin |

---

## Arsitektur Frontend — Pages

```
resources/js/pages/
├── dashboard.tsx
├── teams/
│   ├── show.tsx                 ← Tab container + layout
│   └── partials/
│       ├── overview-tab.tsx
│       ├── tugas-tab.tsx        ← Render KanbanBoard
│       ├── chat-tab.tsx
│       ├── pengumuman-tab.tsx
│       ├── pertanyaan-tab.tsx
│       └── dokumen-tab.tsx
├── members/
│   └── index.tsx
└── tags/
    └── index.tsx
```

---

## Data Sharing via Inertia

`HandleInertiaRequests::share()` mengirim ke semua halaman:

```php
'auth' => [
    'user'        => $user,
    'roles'       => $user->getRoleNames(),
    'permissions' => $user->getAllPermissions()->pluck('name'),
],
'teamsData' => [...],
'tags'      => Tag::orderBy('name')->get(['id', 'name', 'color']),
```

---

## Wayfinder — Type-safe Routes

Semua request ke backend menggunakan **Wayfinder** generated functions (bukan `route()` atau hardcoded URL):

```ts
import * as ColumnActions from '@/actions/App/Http/Controllers/KanbanColumnController';
import * as TaskActions from '@/actions/App/Http/Controllers/TaskController';

// Contoh:
router.put(ColumnActions.update.url(column.id), { title });
router.delete(ColumnActions.destroy.url(column.id));
router.post(TaskActions.store.url(), { ... });
```

---

## File-file Baru yang Dibuat

### Backend (PHP)
- `app/Models/Tag.php`
- `app/Http/Controllers/TeamController.php`
- `app/Http/Controllers/TaskController.php`
- `app/Http/Controllers/KanbanColumnController.php`
- `app/Http/Controllers/KanbanBoardController.php`
- `app/Http/Controllers/MemberController.php`
- `app/Http/Controllers/TagController.php`
- `database/migrations/2026_04_16_060000_create_tags_table.php`
- `database/seeders/RolePermissionSeeder.php`

### Frontend (TypeScript/React)
- `resources/js/components/kanban/kanban-board.tsx`
- `resources/js/components/kanban/kanban-column.tsx`
- `resources/js/components/kanban/kanban-card.tsx`
- `resources/js/components/kanban/task-detail-modal.tsx`
- `resources/js/components/ui/textarea.tsx`
- `resources/js/pages/teams/show.tsx`
- `resources/js/pages/teams/partials/tugas-tab.tsx`
- `resources/js/pages/members/index.tsx`
- `resources/js/pages/tags/index.tsx`

### Config
- `bootstrap/app.php` — Spatie middleware alias
- `config/permission.php` — Spatie config (published)

---

## Known Issues & Next Steps

### Remaining Todos
- [ ] Fitur assign task ke user (relasi task ↔ users)
- [ ] Halaman detail task full (attachment, sub-task, activity log)
- [ ] Chat tab — real-time messaging (WebSocket / polling)
- [ ] Pengumuman & Pertanyaan tab — implementasi konten
- [ ] Dokumen tab — upload file + media library
- [ ] Policy-based authorization (TaskPolicy: hanya bisa delete task sendiri untuk Member)
- [ ] Notifikasi (ketika task di-assign, deadline approaching)
- [ ] Filter & search task di Kanban board
- [ ] Tests (Feature tests untuk RBAC routes)

### Bug Notes
- `route()` helper (Ziggy) tidak tersedia — gunakan **Wayfinder** untuk semua URL generation di frontend
- Spatie middleware alias wajib didaftarkan manual di `bootstrap/app.php` untuk Laravel 11+
