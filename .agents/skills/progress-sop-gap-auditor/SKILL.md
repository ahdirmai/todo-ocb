---
name: progress-sop-gap-auditor
description: >
  Analisis mendalam untuk membandingkan progres nyata pada Kanban
  (Task, Comments, Media) dengan standar dokumen SOP perusahaan menggunakan
  akses data internal. Activate when users ask to audit task progress against
  SOP documents, validate whether Done/In Review tasks have enough evidence,
  or compare team/user task execution with an SOP file.
dependencies:
  - app-data-access
---

# Progress & SOP Gap Auditor

## Role

Corporate Compliance & Progress Analyst.

Conduct a gap analysis between an SOP Document and real-time Kanban data.

## Dependency

Use `app-data-access` for Laravel Eloquent data access and database schema guidance.

## Internal Logic & Execution Steps

### 1. Identity Mapping

Identify these entities from the user's request:

- `team_id`
- `user_id`, when the audit targets a specific assignee or employee
- `document_id` for the targeted SOP document

If the user gives a natural-language SOP name, find a `Document` where `is_sop = true` and the `name` is similar to the requested SOP.

### 2. Data Extraction

Use `app-data-access` to fetch:

- SOP Content: read `Document::find($document_id)->content` or associated file/media metadata when the SOP is uploaded as a file.
- Task List: fetch `Task::where('team_id', $team_id)` and filter by assignee when a `user_id` is provided.
- Activity Logs: fetch `Comment::where('task_id', $task->id)` for progress narratives.
- Physical Evidence: query the `media` table for rows where `model_type = App\Models\Task` and `model_id = $task->id`.

### 3. Cross-Reference Analysis

Compare mandatory SOP steps against task evidence:

- Match SOP-required actions against task title, description, comments, and uploaded media.
- Treat comments as the primary narrative evidence.
- Treat media attachments as physical evidence.
- Check the task's column through `kanban_column_id` to determine status.

### 4. Gap Logic

A gap occurs when:

- A task is in a `Done` or `In Review` column, but a mandatory SOP step is not mentioned in task comments.
- A task is in a `Done` or `In Review` column, but no required file/photo/evidence exists in the media table.
- The task description claims completion but comments/media do not support the claim.

### 5. Language Adaptation

Detect the user's language and translate the final report into the same language as the user's prompt.

Internal reasoning may be in English, but final output must match the user's language.

## Operational Rules

1. Fetch SOP: use `app-data-access` to retrieve the relevant SOP document text.
2. Fetch Tasks: get all tasks including `title`, `description`, and `kanban_column_id`.
3. Audit Evidence: read comments as primary progress narrative.
4. Audit Files: check Spatie Media Library records to confirm required task evidence exists.
5. Validate Status: do not accept `Done` or `In Review` at face value without evidence.
6. Report Gaps: explain exactly which SOP requirement is missing and what evidence is absent.

## Output Template

Translate headers and content into the detected user language.

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

## Example

User asks: "Tolong cek apakah progres tim lapangan sudah sesuai dengan SOP Proyek Properti?"

Internal action:

- Find a document where `is_sop = true` and name resembles `SOP Proyek Properti`.
- Fetch tasks for the Lapangan team.
- Read task comments and media.
- Compare SOP requirements such as "upload site photo" with task media evidence.

Final output:

Return the analysis in Indonesian with a task table, compliance score, critical findings, and recommended actions.
