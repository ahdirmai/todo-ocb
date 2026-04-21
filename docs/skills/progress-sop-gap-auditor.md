# Progress & SOP Gap Auditor

Skill ini dipakai untuk menganalisis kesenjangan antara progres task di Kanban dengan standar kerja pada dokumen SOP perusahaan.

## Profile

- Name: Progress & SOP Gap Auditor
- Description: Analisis mendalam untuk membandingkan progres nyata pada Kanban (Task, Comments, Media) dengan standar dokumen SOP perusahaan menggunakan akses data internal.
- Dependency: `app-data-access`

## Data yang Dibutuhkan

- `team_id`
- `user_id`, jika audit dilakukan untuk user tertentu
- `document_id`, yaitu dokumen SOP target
- `Document.is_sop = true` untuk membedakan SOP dari dokumen biasa

## Alur Analisis

1. Identifikasi team, user, dan SOP dari permintaan user.
2. Ambil konten SOP dari tabel `documents`.
3. Ambil task berdasarkan `team_id`, lalu filter by assignee jika perlu.
4. Ambil komentar task sebagai bukti naratif progres.
5. Ambil media task dari Spatie Media Library sebagai bukti fisik.
6. Bandingkan langkah wajib SOP dengan komentar dan media.
7. Tandai gap jika task sudah `Done` atau `In Review`, tetapi bukti SOP belum lengkap.
8. Tulis hasil akhir dalam bahasa yang sama dengan prompt user.

## Gap Logic

Gap terjadi jika:

- SOP mewajibkan langkah tertentu, tetapi tidak ada komentar task yang menyebut langkah tersebut.
- SOP mewajibkan upload bukti, tetapi task tidak punya media.
- Task berada di kolom `Done` atau `In Review`, tetapi evidence tidak cukup.

## Output Template

```markdown
📊 Executive Progress Report

User/Team: [Name]
SOP Reference: [Document Name]
Compliance Score: [0-100%]
Overall Status: [🟢 Compliant / 🟡 Warning / 🔴 Critical Gap]

🔍 Task Breakdown

| Task | Status | SOP Alignment | Evidence (Comments/Media) | Gap Details |
| --- | --- | --- | --- | --- |
| [Task Title] | [Column Name] | [Matched / Missing] | [e.g., 2 Comments, 1 File] | [Explain what is missing] |

🚩 Critical Findings

Observation: [Detail why the progress does not meet SOP standards.]

💡 Recommended Actions

[User Name]: [Specific instruction to fix the gap.]

Admin/Manager: [Recommendation for oversight.]
```

## Example Usage

User:

```text
Tolong cek apakah progres tim lapangan sudah sesuai dengan SOP Proyek Properti?
```

Expected internal flow:

- Cari dokumen dengan `is_sop = true` dan nama mirip `SOP Proyek Properti`.
- Ambil task pada tim Lapangan.
- Ambil komentar dan media pada setiap task.
- Cocokkan requirement SOP seperti "upload photo of site" dengan bukti media task.
- Output laporan gap dalam bahasa Indonesia.
