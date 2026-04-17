# Team Chat Feature

Fitur chat grup real-time per tim yang hanya bisa diakses oleh anggota tim. Pesan bisa disertai lampiran file — gambar ditampilkan inline, file lain bisa diunduh. Real-time menggunakan Laravel Reverb (sudah berjalan).

---

## Layout UI

```
┌──────────────────────────────────────┬──────────────┐
│  💬 Chat — Nama Tim                  │  Anggota Tim │
│──────────────────────────────────────│              │
│  [Bubble pesan user lain]            │ 👤 Alice     │
│  [Foto inline jika gambar]           │    Admin     │
│  [📎 Download jika file lain]        │ 👤 Bob       │
│  [Bubble pesan sendiri (kanan)]      │    Member    │
│──────────────────────────────────────│              │
│  [📎] [Textarea input        ] [➤]  │              │
└──────────────────────────────────────┴──────────────┘
```

---

## Proposed Changes

### 1. Database

#### [NEW] Migration: `create_team_messages_table`
```
- id (uuid, primary)
- team_id (FK → teams, cascade delete)
- user_id (FK → users, nullable, set null on delete)
- body (text, nullable) — null jika hanya file
- created_at / updated_at
```

File attachment ditangani oleh **Spatie Media Library** (sudah terpasang) via collection `attachments` di model `TeamMessage`.

---

### 2. Model

#### [NEW] `app/Models/TeamMessage.php`
- `HasUuids`, `HasMedia`, `InteractsWithMedia`
- Relasi: `team()` → `belongsTo(Team::class)`, `user()` → `belongsTo(User::class)`
- Media collection `attachments` (semua tipe file)
- Appended accessor `attachments_data` untuk serialisasi ke frontend

#### [MODIFY] `app/Models/Team.php`
Tambah relasi:
```php
public function messages(): HasMany
{
    return $this->hasMany(TeamMessage::class);
}
```

---

### 3. Broadcast Event

#### [NEW] `app/Events/TeamMessageSent.php`
```php
class TeamMessageSent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("team.{$this->message->team_id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id'          => $this->message->id,
                'body'        => $this->message->body,
                'user'        => $this->message->user,
                'attachments' => $this->message->getMedia('attachments')->map(fn ($m) => [
                    'id'       => $m->id,
                    'name'     => $m->file_name,
                    'url'      => $m->getUrl(),
                    'mime'     => $m->mime_type,
                    'size'     => $m->size,
                ]),
                'created_at'  => $this->message->created_at->toISOString(),
            ],
        ];
    }
}
```

---

### 4. Channel Authorization

#### [MODIFY] `routes/channels.php`
```php
Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    return $user->teams()->where('teams.id', $teamId)->exists();
});
```

Hanya user yang terdaftar sebagai anggota tim yang boleh join channel private.

---

### 5. Controller

#### [NEW] `app/Http/Controllers/TeamMessageController.php`

**Authorization helper** (dipakai di setiap method):
```php
private function authorizeTeamMember(Team $team): void
{
    if (! $team->users()->where('user_id', auth()->id())->exists()) {
        abort(403, 'Bukan anggota tim ini.');
    }
}
```

| Method | Route | Deskripsi |
|---|---|---|
| `index(Team $team)` | GET `/teams/{team}/messages` | Ambil 50 pesan terbaru + media |
| `store(Request $request, Team $team)` | POST `/teams/{team}/messages` | Simpan pesan + file, broadcast event |
| `download(TeamMessage $message, Media $media)` | GET `/team-messages/{message}/media/{media}` | Serve file terproteksi |

**`store` flow:**
1. Cek keanggotaan tim
2. Validasi: `body` (nullable string), `attachment` (nullable file, max 20MB)
3. Buat `TeamMessage`
4. Jika ada file, attach ke collection `attachments` via Spatie Media
5. `broadcast(new TeamMessageSent($message))`
6. Return JSON message data

---

### 6. Routes

#### [MODIFY] `routes/web.php`
```php
// Team Chat
Route::get('teams/{team}/messages', [TeamMessageController::class, 'index'])
    ->name('teams.messages.index');
Route::post('teams/{team}/messages', [TeamMessageController::class, 'store'])
    ->name('teams.messages.store');
Route::get('team-messages/{message}/media/{media}', [TeamMessageController::class, 'download'])
    ->name('team-messages.download');
```

---

### 7. TeamController — Load Messages

#### [MODIFY] `app/Http/Controllers/TeamController.php`
Tambah kondisi di `show()` untuk tab `chat`:
```php
if ($tab === 'chat') {
    $extraProps['messages'] = TeamMessage::with(['user', 'media'])
        ->where('team_id', $team->id)
        ->latest()
        ->limit(50)
        ->get()
        ->reverse()
        ->values();
}
```

---

### 8. Frontend — Chat Tab

#### [MODIFY] `resources/js/pages/teams/partials/chat-tab.tsx`

**Struktur komponen:**

```
ChatTab
├── useEffect → window.Echo.private(`team.${team.id}`)
│              .listen('TeamMessageSent', ...)
├── Panel kiri (flex-1, flex col)
│   ├── Header: nama grup + jumlah member
│   ├── MessageList (overflow-y-auto, auto-scroll ke bawah)
│   │   └── MessageBubble × N
│   │       ├── Avatar + nama (jika bukan sendiri)
│   │       ├── Body text
│   │       ├── Gambar inline (jika mime image/*)
│   │       └── Download link (jika file lain)
│   └── InputArea
│       ├── Tombol 📎 (trigger file input hidden)
│       ├── Preview file terpilih (bisa dibatalkan)
│       ├── Textarea (Enter kirim, Shift+Enter newline)
│       └── Tombol Kirim
└── Panel kanan (w-60, shrink-0)
    └── MemberList
        └── MemberItem × N (Avatar + nama + role badge)
```

**Real-time setup:**
```tsx
useEffect(() => {
    const channel = window.Echo.private(`team.${team.id}`);
    channel.listen('.TeamMessageSent', (e: any) => {
        setMessages(prev => [...prev, e.message]);
    });
    return () => {
        window.Echo.leave(`team.${team.id}`);
    };
}, [team.id]);
```

**File upload** via `fetch` dengan `FormData` (bukan Inertia router karena multipart):
```tsx
const formData = new FormData();
formData.append('body', message);
if (file) formData.append('attachment', file);
fetch(`/teams/${team.id}/messages`, {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    body: formData,
});
```

---

## Alur Data

```
User kirim pesan (frontend)
    ↓
POST /teams/{team}/messages (TeamMessageController@store)
    ↓ cek keanggotaan tim
    ↓ simpan TeamMessage + attach media
    ↓ broadcast(TeamMessageSent)
    ↓
Laravel Reverb → private channel "team.{id}"
    ↓
window.Echo listener di ChatTab
    ↓
setMessages → re-render bubble baru
```

---

## Commands yang Perlu Dijalankan

Saya minta kamu jalankan satu per satu setelah disetujui:

1. `php artisan make:migration create_team_messages_table --no-interaction`
2. `php artisan make:model TeamMessage --no-interaction`
3. `php artisan make:event TeamMessageSent --no-interaction`
4. `php artisan make:controller TeamMessageController --no-interaction`
5. `php artisan migrate`
6. `php artisan optimize`
7. `npm run build`

---

## Verification Plan

```bash
php artisan make:test TeamMessageTest --pest
php artisan test --compact --filter=TeamMessage
```

Test cases:
- Member tim bisa ambil pesan (200), non-member dapat 403
- Kirim pesan teks → tersimpan di DB + event broadcast terpicu
- Upload file → media terlampir ke pesan
- Download file oleh non-member → 403
