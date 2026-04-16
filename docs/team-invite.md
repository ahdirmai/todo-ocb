# Fitur Invite User ke Team

> Ditambahkan: 16 April 2026

---

## Overview

Fitur ini memungkinkan Admin/Superadmin untuk mengundang user yang sudah terdaftar ke dalam tim tertentu. User yang diundang langsung masuk ke tim tanpa proses konfirmasi email (immediate join).

Selain itu, tampilan sidebar disesuaikan berdasarkan keanggotaan:
- **Admin/Superadmin** → melihat semua tim aktif
- **Member** → hanya melihat tim yang dia ikuti

---

## Arsitektur

### Backend

#### `TeamMemberController`
```
app/Http/Controllers/TeamMemberController.php
```

| Method | Route | Deskripsi |
|--------|-------|-----------|
| `store` | `POST /teams/{team}/members` | Invite user ke tim (langsung masuk) |
| `destroy` | `DELETE /teams/{team}/members/{user}` | Keluarkan user dari tim |

**Validasi `store`:**
```php
'user_id' => 'required|exists:users,id',
'role'    => 'sometimes|string|in:admin,member', // default: member
```

**Mekanisme:** Menggunakan `syncWithoutDetaching()` — aman untuk re-invite, tidak throw error jika user sudah ada.

#### Filter Sidebar di `HandleInertiaRequests`

```php
$activeTeamsQuery = Team::where('is_active', true);
if ($user && ! $isAdmin) {
    $activeTeamsQuery->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
}
```

- Admin → semua tim aktif
- Member → hanya tim yang `team_user.user_id = $user->id`

#### Data Shared via Inertia

| Prop | Deskripsi |
|------|-----------|
| `teamsData` | Tim yang muncul di sidebar (filtered by membership) |
| `allTeamsData` | Semua tim (untuk halaman `/teams/manage`) |
| `allUsers` | Semua user terdaftar `[id, name, email]` untuk invite dropdown |

---

### Frontend

#### Halaman: `teams/{slug}/overview` → `OverviewTab`
```
resources/js/pages/teams/partials/overview-tab.tsx
```

**Tampilan:**
1. **Banner** — nama tim, kategori, badge status Aktif/Diarsipkan
2. **Quick Stats** — total anggota, jumlah kanban board
3. **Daftar Anggota** — avatar, nama, email, badge role (Admin/Member)
   - Tombol `⋯` → "Keluarkan" (hanya untuk Admin, tidak bisa hapus diri sendiri)
4. **Tombol Undang** → buka modal (hanya Admin/Superadmin)

**Modal Invite:**
- Search user by nama/email (live filter dari `allUsers`, exclude yang sudah member)
- Klik user dari list → user terpilih
- Pilih role (Member / Admin)
- Submit → POST ke `/teams/{team}/members`

---

## Alur Kerja

```
Admin klik "Undang"
  → Modal terbuka
  → Ketik nama/email
  → List user muncul (dari allUsers, exclude member existing)
  → Klik user → user_id tersimpan
  → Pilih role (default: member)
  → Klik "Undang"
  → POST /teams/{team}/members
  → TeamMemberController::store()
  → syncWithoutDetaching([user_id => ['role' => role]])
  → back() → halaman refresh
  → User langsung tampil di daftar anggota
```

---

## Perilaku Khusus

| Skenario | Perilaku |
|---------|---------|
| Re-invite user yang sudah ada | Tidak error, role di-update |
| Member login | Sidebar hanya tampil tim yang dia ikuti |
| Admin login | Sidebar tampil semua tim aktif |
| Keluarkan diri sendiri | Tombol `⋯` tidak muncul untuk user sendiri |
| User baru diundang | Langsung masuk, tidak butuh konfirmasi |

---

## Next Steps (Future)

- [ ] Invite via email (kirim undangan ke email yang belum terdaftar)
- [ ] Transfer ownership / ubah role anggota di dalam tim
- [ ] Notifikasi ketika diundang ke tim
- [ ] Self-request join (user bisa request masuk tim)
