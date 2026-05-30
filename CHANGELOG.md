# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Position Management System**: Complete CRUD for hierarchical position structure
  - Position groups (Direktur, Manager, SPV, Staff, Tim) managed in dedicated page
  - User-specific position names stored separately in users table
  - Position management page with create, edit, delete operations
  - View assigned users per position group
  - Assign/remove users to position groups with specific position names
  - Auto-fill position name from existing user data when assigning
  - Preserve existing position name if not provided during assignment
  - Filter already-assigned users from dropdown
  - New model: `Position` with UUID primary key
  - New controller: `PositionController` with endpoints for CRUD, assign, remove
  - New migration: `create_positions_table`
  - New migration: `add_position_id_to_users_table` (adds FK, migrates data)
  - Data migration seeder: `PositionGroupSeeder` (17 unique positions → 5 groups, 36 users)
  - Frontend: `/positions` page with card-based UI
  - Member management updated to use position dropdown + specific name input
  - Navigation: Added "Manajemen Posisi" to admin sidebar

- **Position-Based Access Control (RBAC)**: Restrict page access based on user position
  - New model: `PositionPermission` for position-route access mapping
  - New controller: `PositionAccessController` for managing permissions
  - New middleware: `CheckPositionAccess` validates position-based route access
  - New migration: `create_position_permissions_table`
  - RBAC management page (`/rbac`) for admin/superadmin to assign permissions
  - Three new protected areas: Pengawas SVP, HR Area, Operational Area
  - Placeholder pages for new areas with development notices
  - Sidebar conditionally renders based on user's position permissions
  - Superadmin/admin bypass position checks automatically
  - Position permissions shared globally via `HandleInertiaRequests`
  - Middleware parameter support: `Route::middleware('position:route-key')`
  - Available route keys: `pengawas-svp`, `hr`, `operational`

- **SPV Team Flag**: Teams can now be designated as SPV (Supervisor) team
  - Only one team can be SPV at a time
  - Toggle SPV status restricted to superadmin role
  - SPV badge displayed on team overview tab
  - New migration: `add_is_spv_team_to_teams_table`
  - New test suite: `TeamSpvFlagTest` with 4 test cases

- **Comment SOP Step Association**: Comments can now be linked to specific SOP steps
  - SOP step dropdown available when commenting on SPV team tasks
  - Comments store reference to `document_sop_step_id`
  - New migration: `add_document_sop_step_id_to_comments`
  - Relationship: `Comment::sopStep()` belongs to `DocumentSopStep`

- **KPI Evaluation System (Backend)**: Position-based KPI tracking for Manager Operasional and Manager HR
  - **Database Layer:**
    - New migration: `create_kpi_task_definitions_table` - Position-specific task templates with weights
    - New migration: `create_kpi_daily_scores_table` - Daily score calculations with grades
    - New migration: `create_kpi_weekly_scores_table` - Weekly aggregates (7-day average)
    - New migration: `create_kpi_monthly_scores_table` - Monthly scores with consistency bonus
    - New migration: `create_kpi_daily_reports_table` - CEO daily report tracking
    - New migration: `add_kpi_fields_to_tasks_table` - Extended tasks table with KPI support
  - **Models:**
    - `KpiTaskDefinition` - Template model with category, weight, verification requirements
    - `KpiDailyScore` - Daily scoring results with grade and category breakdown
    - `KpiWeeklyScore` - Weekly aggregates (Mon-Sun average)
    - `KpiMonthlyScore` - Monthly scores with 5-point consistency bonus (no grade D)
    - `KpiDailyReport` - CEO report submissions with late flag (deadline 22:30 WITA)
    - Extended `Task` model with `is_kpi_task`, `is_verified`, `kpi_task_definition_id`
    - Extended `User` model with `kpiReports()` and `kpiDailyScores()` relationships
  - **Services:**
    - `KpiScoringService` - Calculate daily/weekly/monthly scores, determine grades (A+/A/B/C/D), verify evidence
    - `KpiTaskGenerationService` - Generate daily tasks from templates for SPV team members
    - `KpiReportingService` - CEO daily report management, deadline validation
    - `KpiNotificationService` - Reminders and alerts (stub implementation)
  - **Controllers:**
    - `KpiDashboardController` - User dashboard with today's tasks, scores, trends
    - `KpiReportController` - Daily CEO report submission form
    - `KpiAdminController` - Task definition CRUD, view all scores
    - `KpiCeoController` - Overview dashboard, reports inbox, critical alerts
  - **Scheduled Commands (WITA timezone):**
    - `app:kpi-generate-daily-tasks` - Daily at 00:01 WITA
    - `app:kpi-calculate-daily-scores` - Daily at 23:00 WITA
    - `app:kpi-send-report-reminder` - Daily at 21:00 WITA
    - `app:kpi-calculate-weekly-scores` - Weekly Monday 01:00 WITA
    - `app:kpi-calculate-monthly-scores` - Monthly 1st 02:00 WITA
  - **Data Seeding:**
    - `KpiTaskDefinitionSeeder` - 50 task definitions from PDF requirements
    - Manager Operasional: 34 tasks across 20 categories (Audit 15%, Absensi 12%, etc.)
    - Manager HR: 16 tasks across 12 categories (Compliance 24%, Training 12%, etc.)
  - **Grading System:**
    - A+ (95-100%): Excellent - Reward + promotion consideration
    - A (85-94%): On Target - Continue monitoring
    - B (70-84%): Needs Improvement - Weekly CEO coaching
    - C (50-69%): Warning - SP1 + 30-day improvement plan
    - D (<50%): Critical - SP2/SP3 + position evaluation
  - **Evidence Verification:**
    - Tasks require comment + attachment for verification
    - Auto-verification via `KpiScoringService::verifyTaskEvidence()`
    - Tasks marked with `is_verified` flag and `verified_at` timestamp
  - **Routes (Restructured):**
    - HR routes: `/hr/kpi/*` - Manager HR dashboard, scores, reports
    - Operational routes: `/operational/kpi/*` - Manager Operasional dashboard, scores, reports
    - Admin routes: `/kpi/admin/definitions`, `/kpi/admin/scores`
    - CEO routes (superadmin only): `/kpi/ceo/dashboard`, `/kpi/ceo/daily-reports`, `/kpi/ceo/alerts`
  - **Controllers:**
    - Position-aware rendering via `getPositionArea()` helper method
    - Automatically detects Manager HR vs Manager Operasional
    - Renders pages in correct namespace: `{area}/kpi/{page}`
    - Route names: `{area}.kpi.{action}` (hr.kpi.dashboard, operational.kpi.dashboard)

- **KPI Evaluation System (Frontend)**: Complete React/TypeScript UI for Manager HR and Manager Operasional
  - **Pages (7 per position area):**
    - `dashboard.tsx` - Main KPI dashboard with today's score, task list, weekly/monthly summary
    - `daily-detail.tsx` - Daily score breakdown with task details
    - `weekly-detail.tsx` - Weekly average scores (Mon-Sun)
    - `monthly-detail.tsx` - Monthly score with consistency bonus display
    - `report-form.tsx` - CEO daily report submission form with deadline warnings
    - `reports.tsx` - Report history with pagination
    - `no-access.tsx` - Access denied message for users not in SPV team
  - **Shared Components:**
    - `kpi/grade-badge.tsx` - Color-coded grade badges (A+: green, D: red)
    - `kpi/score-card.tsx` - Score display card with progress bar and grade
  - **Features:**
    - Task list grouped by category with completion indicators
    - Category breakdown with progress visualization
    - Verification status badges (Verified, Selesai - Perlu Bukti, Belum Selesai)
    - Late submission warnings (22:30 WITA deadline) with real-time clock
    - Responsive grid layout for scores and categories
    - Navigation breadcrumbs with back buttons
    - Pagination for report history
  - **Deployment:**
    - HR Area: `resources/js/pages/hr/kpi/*`
    - Operational Area: `resources/js/pages/operational/kpi/*`
    - Both areas share same components and logic
    - Routes automatically adjusted per position

### Fixed
- **TaskColumnScoringService**: Corrected auto-scoring logic for last step
  - Changed condition from `>=` to `>` to only award max score when task has PASSED the last step, not when currently AT it
  - Fixes failing tests in `MonthlyTaskReportingTest`

- **DocumentCommentController**: Fixed missing parameter in update method
  - Added `Document $document` parameter to match route definition `documents/{document}/comments/{comment}`
  - Resolves TypeError when updating document comments

- **TeamController**: Fixed `$extraProps` initialization order
  - Moved array initialization to beginning of method to prevent data loss
  - Ensures `spvSopSteps` is properly passed to frontend
  - Restricted SOP step dropdown to only show on SPV team tasks (not all teams)

### Changed
- Team model now casts `is_spv_team` as boolean
- Comment model now has `sopStep` relationship
- CommentController validates and stores `document_sop_step_id`
- Task detail modal shows SOP step selector when available on SPV teams
- Team overview tab displays SPV status badge and toggle for superadmins
