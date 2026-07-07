# Plan: AI Check Kesesuaian Pengerjaan Daily Task

## Context

Task KPI saat ini "verified" hanya dari **struktur bukti** (`KpiScoringService::verifyTaskEvidence()` → `full`/`partial`/`none`) plus gate baru `require_video_upload` & `minimum_photos`. Tidak ada pengecekan **isi** komentar terhadap aturan task.

User ingin **AI check**: bandingkan komentar user (teks bukti) dengan definisi task (`task_name`, `description`, `work_method`, `verification_method`). AI beri skor kesesuaian 0–100%.

Aturan:
- Kesesuaian **≥80%** → task lulus, dihitung **penuh** (bobot × 100%), `is_verified=true`.
- Kesesuaian **<80%** → belum selesai, user **submit lagi**.
- **Maks 3× submit**. Setelah 3× gagal → **skor parsial** = kesesuaian% × bobot.
- Task lulus / exhausted **dihitung ke gate laporan 80%**.

## Keputusan
- **Per-task** (bukan batch) — requirement (3× attempt, resubmit selektif, parsial per task) inheren per-task.
- **Async queue** — job `CheckTaskComplianceJob`, frontend poll status.
- **Provider: OpenAI** model **`gpt-5.5-nano`** (permintaan user; ganti default `gpt-5-mini`).

## Infra SUDAH ADA (reuse, tanpa dep baru)
- OpenAI config: `config/services.php:42` (`openai.api_key/base_url/reporting_model`). Pola call `/responses` + `json_schema` di `AiReportingService::generateWithOpenAi()` (baris ~62-121): `Http::baseUrl($this->baseUrl('openai'))->withToken()->post('responses', [... 'text'=>['format'=>['type'=>'json_schema',...]]])`, ekstraksi `output[].content[].output_text.text`. Helper `baseUrl()` (allowlist host, baris 222), `shouldRetry()` (baris 247).
- Queue `database` default; job pattern `ParseTeamSopJob` (`implements ShouldQueue`, `use Queueable`, `$timeout`, `$tries=1`, constructor readonly).
- Scoring: `KpiScoringService::verifyTaskEvidence()` + `calculateDailyScore()` (baris 72-111, sudah ada cabang `auto_done_on_report`, gate `require_video_upload`/`minimum_photos`).

## ⚠ Prasyarat (BLOCKER)
`OPENAI_API_KEY` **belum ada di `.env`** (cek: grep 0). User harus set `OPENAI_API_KEY=...` dan (opsional) `OPENAI_REPORTING_MODEL=gpt-5.5-nano` sebelum fitur jalan. Tanpa key, `scoreCompliance()` lempar `RuntimeException` → job set status `failed` (tanpa buang jatah).

## Perubahan

### 1. Migration — kolom AI check di `tasks`
File baru `xxxx_add_ai_check_to_tasks_table.php`:
```php
$table->string('ai_check_status')->nullable()->after('verified_at'); // null|pending|passed|failed|exhausted
$table->unsignedTinyInteger('ai_check_attempts')->default(0)->after('ai_check_status');
$table->decimal('ai_compliance_score', 5, 2)->nullable()->after('ai_check_attempts');
$table->text('ai_check_feedback')->nullable()->after('ai_compliance_score');
$table->timestamp('ai_checked_at')->nullable()->after('ai_check_feedback');
```
`Task` model pakai `$guarded = []` (cek `app/Models/Task.php:17`) → tak perlu fillable. Tambah cast di `casts()`: `ai_check_attempts`→`integer`, `ai_compliance_score`→`decimal:2`, `ai_checked_at`→`datetime`.

### 2. Service baru `app/Services/AiTaskCheckService.php`
House style (`Http` facade, `baseUrl()`+`shouldRetry()` pola OpenAI, `RuntimeException`). Method:
```php
/** @return array{score: float, feedback: string} */
public function scoreCompliance(KpiTaskDefinition $definition, string $commentText): array
```
- Guna endpoint OpenAI `/responses` + `json_schema` (strict) schema `{score:number 0-100, feedback:string}`.
- `model` = `config('services.openai.reporting_model')` (user set ke `gpt-5.5-nano`).
- System prompt: "auditor KPI, nilai 0–100 seberapa sesuai bukti user dgn `work_method`+`verification_method`, balas JSON `{score, feedback(ID singkat)}`". User content = definisi (4 field) + commentText.
- Ekstraksi `output_text.text` → `json_decode` → clamp score 0–100. API key kosong / error → `RuntimeException`.
- **Isolasi allowlist**: reuse pola `baseUrl('openai')` (host `api.openai.com`).

### 3. Job baru `app/Jobs/CheckTaskComplianceJob.php`
Pola `ParseTeamSopJob`: `ShouldQueue`, `Queueable`, `public int $timeout = 90; public int $tries = 1;`, constructor `public readonly string $taskId`.
`handle(AiTaskCheckService $ai, KpiScoringService $scoring)`:
1. Load task + `kpiDefinition`. Guard: KPI task, ada definition, `ai_check_status==='pending'`, `ai_check_attempts < 3`.
2. Teks bukti = `$task->comments()->pluck('content')->implode("\n")`.
3. `try { [$score,$feedback] = $ai->scoreCompliance($def, $text) } catch RuntimeException` → set `ai_check_status='failed'`, `ai_check_feedback='Gagal cek AI, coba submit ulang.'` **tanpa** increment attempt, return.
4. Update task: `ai_compliance_score`, `ai_check_feedback`, `ai_checked_at=now()`, increment `ai_check_attempts`.
5. Status:
   - `$score >= 80` → `passed`, `is_verified=true`, `verified_at=now()`.
   - `$score < 80 && attempts >= 3` → `exhausted`, `is_verified=false`.
   - else → `failed`.
6. Recompute daily/weekly/monthly (try/catch, pola `verifyTask` baris 738-758). Butuh `$user` = `$task->creator`; date = `$task->created_at`.

### 4. Scoring — `KpiScoringService::calculateDailyScore()` (baris 72-111)
Sisipkan cabang AI **di atas** logika evidence lama, DALAM struktur if/else yang ada. Urutan final untuk task ber-`kpiDefinition`:
```
if (auto_done_on_report && is_verified)         → full, mult 1.0   (TETAP, paling atas)
elseif (ai_check_status === 'passed')           → full, mult 1.0, verifiedTasks++
elseif (ai_check_status === 'exhausted')        → mult = ai_compliance_score/100 (parsial), completedTasks++ (bukan verified)
elseif (ai_check_status in [null,'pending','failed']) → mult 0
else                                            → fallback lama (verifyTaskEvidence + video/photo cap)   // task tanpa AI flow / definisi lama
```
**Catatan interplay**: karena AI check jadi jalur utama untuk task KPI dgn definition, cabang lama (`verifyTaskEvidence` + gate video/photo cap baris 79-110) tetap dipertahankan sebagai **fallback** untuk task yang belum pernah masuk AI flow (`ai_check_status===null`) — supaya task existing / definisi lama tak regresi ke skor 0. Simpan `ai_compliance_score`, `ai_check_status`, `ai_check_attempts` ke `task_details[]`.

### 5. Controller `KpiDashboardController::verifyTask()` (baris 693)
Ubah dari "set is_verified via evidence" → "trigger AI check". Urutan gate (pertahankan yang ada, tambah di ujung):
```
1. kepemilikan (creator/assignee)            — TETAP (baris 698-704)
2. require_video_upload gate                 — TETAP (baris 706-713)
3. minimum_photos gate                       — TETAP (baris 715-723)
4. prasyarat evidence: verifyTaskEvidence==='full' → else back()->withErrors('Lengkapi komentar + foto dulu.')
5. sudah 'passed' → tolak ('Task sudah lulus AI.')
6. ai_check_attempts >= 3 → tolak ('Jatah cek AI 3× sudah habis.')
7. set ai_check_status='pending'; CheckTaskComplianceJob::dispatch($task->id)
8. back()->with('success','Bukti sedang dicek AI, tunggu sebentar...')
```
Hapus blok set `is_verified` + recompute skor lama (baris 725-760) — recompute pindah ke job (#3.6).

### 6. Serialisasi task (3 titik: `index` ~145, `spvDashboard` ~199, `daily` ~411 di `KpiDashboardController`; ikuti pola `require_video_upload`/`minimum_photos` yang sudah ada di ketiga titik)
Tambah: `ai_check_status`, `ai_compliance_score`, `ai_check_attempts`, `ai_check_feedback`, `ai_max_attempts => 3`. `is_done`/`is_verified` tetap dari `is_verified`. (Cek juga `spv/kpi/dashboard` serialization di sekitar baris 546-583 kalau task KPI di-map di sana.)

### 7. Frontend `resources/js/components/kpi/kpi-task-modal.tsx`
- `KpiTask` interface: tambah `ai_check_status?`, `ai_compliance_score?`, `ai_check_attempts?`, `ai_check_feedback?`, `ai_max_attempts?`.
- `handleSubmitComment` sudah panggil verify → sekarang set status `pending`.
- **Polling**: saat `task.ai_check_status==='pending'`, `setInterval(() => router.reload({ only:[...] }), 3000)` sampai status ≠ pending; clear on unmount/close. Spinner "AI sedang mengecek…".
- Tampilan hasil:
  - `passed` → badge hijau "Lulus AI ({score}%)" + feedback.
  - `failed` (attempts<3) → badge merah "Belum sesuai ({score}%) — sisa {3-attempts}×" + feedback + submit ulang aktif.
  - `exhausted` → badge abu "Jatah habis — parsial {score}%" + feedback, upload dikunci.
- Upload section disembunyikan saat `passed`/`exhausted` (pola `!task.is_verified` existing) + saat `pending`.

### 8. Config
Tak ada dep baru. `.env`: `OPENAI_API_KEY` (WAJIB, belum ada) + opsional `OPENAI_REPORTING_MODEL=gpt-5.5-nano`. Kalau mau pisah model dari monthly-report: tambah `config('services.openai.task_check_model', reporting_model)` (opsional).

### 9. Tests `tests/Feature/AiTaskCheckTest.php` (Pest)
Bind fake `AiTaskCheckService` ke container (tak call API asli) + `Queue::fake()`:
- verify dgn komentar+foto (evidence full) → status `pending`, `Queue::assertPushed(CheckTaskComplianceJob)`.
- Job passed (mock 90) → `is_verified=true`, daily score bobot penuh.
- Job failed (mock 50, attempt 1) → `failed`, is_verified false, boleh resubmit.
- 3× gagal → `exhausted`, daily score parsial (score%×bobot), dihitung ke gate.
- Tolak trigger tanpa foto (evidence < full) & saat attempts≥3.
- `AiTaskCheckService` error (RuntimeException) → job set `failed` tanpa increment attempt.
- Scoring unit: passed→1.0, exhausted→score/100, null→fallback evidence lama (tak regresi).

## Verifikasi
1. **Set `OPENAI_API_KEY` di `.env` dulu** (blocker). `php artisan config:clear`.
2. `php artisan migrate` (dev + `DB_DATABASE=kpi_ocb_testing`).
3. `vendor/bin/pint --dirty --format agent` + `npm run build`.
4. `php artisan test --compact --filter=AiTaskCheck` (Queue::fake + service mock, tanpa API asli).
5. Manual (queue worker jalan: `php artisan queue:work`): SPV isi komentar+foto → Submit → "AI sedang mengecek" → beberapa detik → passed/failed. 3× gagal → parsial.

## Catatan
- `ai_check_feedback` = feedback terakhir. Riwayat per-attempt (tabel `task_ai_checks`) di luar scope.
- Task KPI tanpa `kpiDefinition` / `ai_check_status===null` → fallback logika lama (evidence + video/photo gate), tak regresi.
- Gate `require_video_upload`/`minimum_photos` tetap PRA-syarat sebelum AI check (video/foto wajib sebelum bukti dinilai isinya).
