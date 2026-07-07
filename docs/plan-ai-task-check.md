# Plan: AI Check Kesesuaian Pengerjaan Daily Task

## Context

Saat ini task KPI dianggap "selesai/verified" hanya berdasarkan **struktur bukti** — ada komentar + ada foto (`KpiScoringService::verifyTaskEvidence()` return `full`/`partial`/`none`). Tidak ada pengecekan **isi** komentar terhadap aturan task.

User ingin **AI check**: bandingkan komentar user (teks bukti pengerjaan) dengan definisi task (`task_name`, `description`, `work_method`, `verification_method` di `kpi_task_definitions`). AI beri skor kesesuaian 0–100%.

Aturan:
- Kesesuaian **≥80%** → task lulus, dihitung **penuh** (bobot × 100%) ke daily score, `is_verified=true`.
- Kesesuaian **<80%** → task belum selesai, user **harus submit lagi**.
- **Maks 3× submit** (3× AI check). Setelah 3× tetap gagal → task dapat **skor parsial** = kesesuaian% × bobot. Contoh: kesesuaian 40%, bobot 2% → dapat **0.8%** ke daily score.
- Task lulus / exhausted (parsial) **dihitung ke gate laporan 80%**.

---

## Analisa: Per-Task (1/1) vs Per-Daily (1× cek semua)

### Per-Task — AI check tiap task saat user submit bukti task itu

**Pros**
- Cocok 100% dgn requirement: maks 3 submit **per task**, resubmit hanya task gagal, counter attempt bersih.
- Prompt kecil & fokus (1 definisi + 1 komentar) → akurasi skor tinggi, hemat token/call, tak kena truncation.
- Feedback langsung saat kerja tiap task → user tahu segera lulus/gagal, alur retry natural.
- Kegagalan/timeout AI terisolasi ke 1 task; tak menggagalkan seluruh laporan harian.
- Skor parsial mudah dihitung per task (skor% × bobot).

**Cons**
- Banyak call (≤34 task × ≤3 attempt) → total call harian lebih banyak (tapi tiap call murah).
- Perlu counter attempt + status per task (kolom baru di `tasks`).
- Beban queue lebih sering (job kecil-kecil).

### Per-Daily (batch) — 1 call AI menilai semua task sekaligus di akhir hari

**Pros**
- Jumlah call minimal (1–beberapa per hari).
- Satu ringkasan besar sekali jalan.

**Cons**
- **Bentrok dgn requirement**: "maks 3 submit per task" & "resubmit task yang gagal" susah dipetakan ke batch — batch tak tahu attempt per task, sulit resubmit 1 task saja.
- Context besar (34 task × komentar+4 field aturan) → risiko truncation, mapping salah, halusinasi, skor tiap task kurang akurat.
- Tak ada feedback real-time; user baru tahu hasil di akhir → kalau gagal harus ulang di penghujung hari, boros waktu.
- 1 kegagalan AI menjatuhkan penilaian **semua** task hari itu.
- Sulit gate laporan 80% progresif (butuh nunggu batch selesai).

**Kesimpulan:** requirement (maks 3 submit, resubmit selektif, counter attempt, skor parsial per task) **inheren per-task**. Per-task menang telak; batch hanya unggul di jumlah call tapi kalah di akurasi, UX, isolasi error, dan kesesuaian requirement.

---

## Keputusan

- **Eksekusi per-task** (bukan batch)
- **Async queue** — job `CheckTaskComplianceJob`, frontend poll status
- **Provider**: Anthropic API (sudah aktif, `ANTHROPIC_API_KEY` terisi)

---

## Infra yang SUDAH ADA (dipakai ulang, tanpa dep baru)

- **Anthropic API** aktif: `config/services.php` `anthropic.*`, `ANTHROPIC_API_KEY` terisi di `.env`. Model default `claude-haiku-4-5`.
- Pola HTTP call: `app/Services/AiReportingService.php` (Http facade, `baseUrl()` allowlist host, retry `shouldRetry()`, JSON decode helper) & `SopAiParser.php:284-299` (Anthropic `messages`).
- Queue: `config/queue.php` default `database`; job pattern `ParseTeamSopJob`.
- Scoring: `KpiScoringService::verifyTaskEvidence()` (titik ganti) + `calculateDailyScore()`.

---

## Perubahan

### 1. Migration — kolom AI check di `tasks`
File baru: `database/migrations/xxxx_add_ai_check_to_tasks_table.php`
```php
$table->string('ai_check_status')->nullable()->after('verified_at'); // null|pending|passed|failed|exhausted
$table->unsignedTinyInteger('ai_check_attempts')->default(0)->after('ai_check_status');
$table->decimal('ai_compliance_score', 5, 2)->nullable()->after('ai_check_attempts'); // 0..100
$table->text('ai_check_feedback')->nullable()->after('ai_compliance_score'); // feedback terakhir dari AI
$table->timestamp('ai_checked_at')->nullable()->after('ai_check_feedback');
```
`Task` model (`app/Models/Task.php`): tambah 5 kolom ke `$fillable` + cast `ai_check_attempts`→int, `ai_compliance_score`→decimal:2, `ai_checked_at`→datetime.

### 2. Service baru — `app/Services/AiTaskCheckService.php`
Meniru house style (no constructor, `match` platform, private `scoreWithAnthropic()`, `RuntimeException`, retry). Method utama:
```php
/** @return array{score: float, feedback: string} */
public function scoreCompliance(KpiTaskDefinition $definition, string $commentText): array
```
- Bangun prompt: kirim `task_name`, `description`, `work_method`, `verification_method` (definisi) + `commentText` (bukti user). Instruksi: nilai 0–100 seberapa sesuai bukti dgn cara kerja & cara verifikasi; balas **JSON** `{"score": <0-100>, "feedback": "<alasan singkat Bahasa Indonesia>"}`.
- `Http::baseUrl(config anthropic base)->withHeaders(x-api-key, anthropic-version)->timeout(60)->retry(...)` → `POST messages` model `config('services.anthropic.reporting_model')`. Reuse `baseUrl()` allowlist + `shouldRetry()` pola `AiReportingService`.
- Parse JSON dari response (helper decode toleran seperti `AiReportingService`). Clamp score 0–100. Kalau AI gagal/timeout → lempar `RuntimeException` (job catch).

### 3. Job baru — `app/Jobs/CheckTaskComplianceJob.php`
Pola `ParseTeamSopJob`: `implements ShouldQueue`, `use Queueable`, `public int $timeout = 90; public int $tries = 1;` constructor `public readonly string $taskId`.
`handle(AiTaskCheckService $ai, KpiScoringService $scoring)`:
1. Load task + `kpiDefinition`. Guard: KPI task, punya definition, `ai_check_status==='pending'`, `attempts < 3`.
2. Ambil teks bukti = gabungan `content` semua komentar user pada task (`$task->comments()->pluck('content')->implode("\n")`).
3. `[$score,$feedback] = $ai->scoreCompliance($definition, $text)`.
4. Update task: `ai_compliance_score=$score`, `ai_check_feedback=$feedback`, `ai_checked_at=now()`, increment `ai_check_attempts`.
5. Tentukan status:
   - `$score >= 80` → `ai_check_status='passed'`, `is_verified=true`, `verified_at=now()`.
   - `$score < 80` & `attempts >= 3` → `ai_check_status='exhausted'` (parsial final), `is_verified=false`.
   - else → `ai_check_status='failed'` (boleh resubmit).
6. Recompute skor: `calculateDailyScore` + weekly + monthly (try/catch, pola `verifyTask`).
7. Gagal AI (exception) → set `ai_check_status='failed'` **tanpa** increment attempt (biar tak boros jatah karena error sistem), simpan feedback error generik.

### 4. Scoring — `app/Services/KpiScoringService.php`
Ganti sumber `weightMultiplier` di `calculateDailyScore()` (baris ~72-96) untuk task ber-`kpiDefinition` agar berbasis AI check, bukan `verifyTaskEvidence` lama:
- `ai_check_status==='passed'` → multiplier `1.0`, `verifiedTasks++`.
- `ai_check_status==='exhausted'` → multiplier `ai_compliance_score/100` (parsial), `completedTasks++` (bukan verified).
- else (`null`/`pending`/`failed`) → `0`.
Simpan `ai_compliance_score`, `ai_check_status`, `ai_check_attempts` ke `task_details[]`.
`verifyTaskEvidence()` tetap dipakai sbg **prasyarat**: AI check hanya boleh jalan kalau bukti minimal ada (komentar + foto) — dicek di endpoint sebelum dispatch (lihat #5). Task KPI tanpa definition: fallback ke logika lama (biar tak regresi).

### 5. Controller — ganti auto-verify jadi trigger AI check
`app/Http/Controllers/KpiDashboardController.php`:
- **`verifyTask()`** (baris 683): alih-alih set `is_verified` dari `verifyTaskEvidence`, jadikan **trigger AI check**. Guard kepemilikan tetap. Tambah:
  - Prasyarat bukti: `verifyTaskEvidence($task)==='full'` (harus ada komentar+foto), else `back()->withErrors`.
  - Sudah `passed` → tolak (sudah lulus). `attempts >= 3` → tolak ("jatah 3× habis").
  - Set `ai_check_status='pending'`, dispatch `CheckTaskComplianceJob::dispatch($task->id)`.
  - `back()->with('success','Bukti sedang dicek AI...')`.
  (Route `{area}/kpi/tasks/{task}/verify` tetap; nama tak berubah.)
- **Serialisasi task** (di `index()`, `spvDashboard()`, `daily()` — semua tempat map task KPI): tambahkan `ai_check_status`, `ai_compliance_score`, `ai_check_attempts`, `ai_check_feedback`, dan `ai_max_attempts => 3`. `is_done` tetap dari `is_verified`.

### 6. Frontend — `resources/js/components/kpi/kpi-task-modal.tsx`
- Setelah submit komentar sukses, panggil endpoint verify (sudah ada di `handleSubmitComment`) → sekarang men-set status `pending`.
- Tambah **polling**: saat `task.ai_check_status==='pending'`, `setInterval(() => router.reload({ only: [...tasks props...] }), 3000)` sampai status ≠ pending; clear on unmount/close. Tampilkan spinner "AI sedang mengecek…".
- Tampilkan hasil:
  - `passed` → badge hijau "Lulus AI (skor%)" + feedback.
  - `failed` (attempts<3) → badge merah "Belum sesuai (skor%) — sisa jatah {3-attempts}×", tampilkan feedback, tombol **Submit Ulang** aktif (upload bukti baru → verify lagi).
  - `exhausted` → badge abu "Jatah habis — skor parsial skor% (dapat {skor%×bobot}%)", feedback, upload dikunci.
- Section upload disembunyikan saat `passed`/`exhausted` (mirip pola existing `!task.is_verified`).

### 7. Config
Tak ada dep baru. Pastikan `ANTHROPIC_API_KEY` ada (sudah). Tambah opsi `config('services.anthropic.task_check_model', reporting_model)` bila mau pisah model (opsional, default reuse reporting_model).

### 8. Tests — `tests/Feature/AiTaskCheckTest.php` (Pest)
Mock `AiTaskCheckService` (bind fake ke container) supaya tak call API asli:
- Submit bukti (komentar+foto) → status `pending`, job ter-dispatch (`Queue::fake` + `assertPushed`).
- Job `passed` (mock skor 90) → `is_verified=true`, daily score dapat bobot penuh.
- Job `failed` skor 50 attempts 1 → status `failed`, is_verified false, boleh resubmit.
- 3× gagal → `exhausted`, daily score dapat parsial (skor%×bobot), dihitung ke gate.
- Tolak trigger tanpa foto (prasyarat evidence) & saat attempts≥3.
- `KpiScoringService` unit: multiplier passed=1.0, exhausted=score/100.

---

## Verifikasi

1. `php artisan migrate` → kolom AI check ada di `tasks`.
2. `vendor/bin/pint --dirty --format agent` + `npm run build`.
3. `php artisan test --compact --filter=AiTaskCheck` → hijau (pakai `Queue::fake` + service mock, tanpa API asli).
4. Manual di `https://todo-app-v2.test` (queue worker jalan: `php artisan queue:work` atau `composer dev`):
   - Login SPV, buka daily task, isi komentar bukti + foto → Submit → status "AI sedang mengecek".
   - Komentar bagus (sesuai cara kerja) → beberapa detik → "Lulus (≥80%)", task verified, daily score naik penuh.
   - Komentar asal → "Belum sesuai (<80%)", feedback muncul, submit ulang (maks 3×).
   - Setelah 3× gagal → skor parsial, task dihitung parsial ke gate laporan 80%.
5. Cek biaya/timeout: 1 task = 1 call kecil; job `$timeout=90`, retry pada 5xx/timeout.

---

## Catatan

- Kolom `ai_check_feedback` simpan feedback **terakhir**; bila mau riwayat tiap attempt, bisa tabel `task_ai_checks` — di luar scope awal, bisa iterasi.
- Task KPI tanpa `kpiDefinition` (definition null): fallback ke logika verifikasi lama (`verifyTaskEvidence` langsung), biar tak regresi.
