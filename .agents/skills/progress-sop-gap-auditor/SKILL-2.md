---
name: progress-sop-gap-auditor
description: >
  Analisis mendalam untuk membandingkan progres nyata pada Kanban
  (Task, Comments, Media) dengan standar dokumen SOP perusahaan menggunakan
  AI Read API. Digunakan untuk audit KPI berbasis bukti (evidence-based audit),
  validasi task Done/In Review, deteksi false completion, dan evaluasi kepatuhan berbobot.
dependencies:
  - app-data-access
---

# Progress & SOP Gap Auditor

## Role

Corporate Compliance & KPI Progress Auditor.

Agent melakukan audit berbasis bukti terhadap task dan membandingkannya
dengan SOP secara **deterministic, measurable, dan API-driven**.

---

# Core Objective

1. Evaluasi compliance terhadap SOP
2. Hitung weighted compliance score
3. Deteksi gap & false completion
4. Validasi sequence workflow
5. Validasi evidence

---

# Execution Flow (API-First)

## 1. Context Initialization (WAJIB)

```http
GET /api/teams/{team}/context
```

Gunakan:
- `context.sop.primary_document`
- `context.sop.has_sop`

Jika tidak ada SOP:
- gunakan fallback audit rule

## 2. Fetch SOP Document

```http
GET /api/documents/{document}
```

Ambil:
- `content`
- `name`

## 3. Fetch Tasks (KPI Source)

```http
GET /api/teams/{team}/tasks
```

Optional filter:
- by assignee (jika `user_id` ada)

## 4. Fetch Evidence

Untuk setiap task:

### Comments
```http
GET /api/tasks/{task}
```
→ ambil comments (jika included / embedded)

**ATAU:**
```http
GET /api/teams/{team}/activity-logs
```

### Media (Attachments)
Gunakan data media dari task response (jika tersedia) atau metadata attachment yang disediakan API.

## 5. SOP Parsing (STRICT)

Transform SOP menjadi structured rules:

```json
{
  "steps": [
    {
      "id": "S1",
      "name": "Langkah",
      "action": "aksi eksplisit",
      "required_evidence": "comment | media | both",
      "keywords": ["keyword spesifik"],
      "weight": 1-5,
      "priority": "low | medium | high",
      "min_comment": 0,
      "min_media": 0,
      "sequence_order": 1,
      "expected_column": "column name",
      "is_mandatory": true
    }
  ]
}
```

### Parsing Rules (WAJIB)
- Harus ada action eksplisit
- Harus ada evidence type
- Harus ada indikator validasi
- Abaikan deskripsi non-actionable

## 6. KPI Derivation

Jika tidak ada progress field:

### Column-based:
- TODO → 0%
- IN PROGRESS → 50%
- IN REVIEW → 80%
- DONE → 100%

### Time-based:
`expected_progress = elapsed_time / total_time`

## 7. Validation Engine

Evaluasi setiap step:

### A. Evidence Check
- comment ≥ `min_comment`
- media ≥ `min_media`

### B. Keyword Matching
- strict OR semantic
- threshold ≥ 0.7

### C. Column Validation
**IF** `task.column != expected_column`
→ flag mismatch

### D. Sequence Validation
**IF** `step_n` done AND `step_(n-1)` missing
→ violation

## 8. Scoring System (Weighted)

`weighted_score = sum(matched_weight) / sum(total_weight) * 100`

## 9. Gap Detection

### A. Missing Step
Mandatory step tidak terpenuhi

### B. Missing Evidence
Evidence tidak cukup

### C. False Completion
**IF:**
status IN (DONE, IN REVIEW)
AND `weighted_score < 70`
→ **CRITICAL**

### D. Sequence Violation
Step lompat

### E. Narrative Without Evidence
Claim tanpa bukti

## 10. Aggregation

Hitung:
- average score
- total gap
- critical issues
- per user performance

---

## Operational Rules

- **WAJIB** mulai dari: `GET /api/teams/{team}/context`
- Gunakan API, bukan query langsung
- Jangan percaya status tanpa evidence
- Komentar generik = invalid
- Semua evaluasi harus berbasis data

---

## Output Template

```markdown
📊 Laporan Eksekutif Progres

Tim: [Nama]
SOP: [Dokumen]
Compliance: [0-100%]
Status: [🟢 / 🟡 / 🔴]

---

🔍 Rincian

| Task | Status | Score | Evidence | Gap |
|------|--------|-------|----------|-----|

---

🚩 Temuan

- ...

---

💡 Rekomendasi

User:
- ...

Manager:
- ...
```

---

## Final Principle

**Gunakan:**
- API sebagai source of truth
- Rule sebagai evaluator
- AI hanya sebagai interpreter

**Jangan:**
- akses DB langsung
- asumsi data
- infer tanpa evidence