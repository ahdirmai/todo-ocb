# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **CEO Dashboard — 500 Error When User Removed from Position**: Filtering scores by position threw when `job_position` was null
  - Root cause: `$s['user']['job_position']['name']` — no null guard on `job_position`
  - Fix: use `($s['user']['job_position']['name'] ?? null)` in both `hrScores` and `opsScores` filters in `KpiCeoController::index()`

- **CEO User Detail — Task Rows Not Openable**: Clicking tasks on `/kpi/ceo/user/{user}` did nothing — rows were static divs with no modal
  - Fix: `KpiCeoController::userDetail()` now loads actual `Task` models for the date with comments and media, passed as `tasks` prop
  - Added read-only `TaskDetailModal` component and `selectedTaskId` state to `ceo-user-detail.tsx`
  - Task rows are now clickable (cursor-pointer + hover) and open the modal showing comments and file attachments

- **KPI Score Not Updating After Verify for Manager Without SPV Team**: Manager HR/Operasional on production not in SPV team — score silently skipped, never saved
  - Root cause: `calculateDailyScore()` threw if user had no SPV team; task query used `team_id = spvTeam.id` but manager tasks are created with `team_id = null`; `kpi_daily_scores.team_id` was NOT NULL so saving without team would fail anyway
  - Fix: `calculateDailyScore()` now allows managers (Manager HR / Manager Operasional) without SPV team, queries tasks with `WHERE team_id IS NULL` for teamless managers
  - Migration: `kpi_daily_scores.team_id` made nullable

- **KPI Task Verify — 500 Error for Non-SPV Users** (`POST /hr/kpi/tasks/{task}/verify`): Admin users not in SPV team got a 500 when verifying
  - Root cause: `calculateDailyScore()` throws `\Exception('User must have position and be in SPV team')` — the call in `verifyTask()` was not wrapped in try-catch unlike weekly/monthly score calls
  - Fix: wrapped `calculateDailyScore()` call in try-catch in `KpiDashboardController::verifyTask()`

- **Comment Content Too Long — 500 Instead of Validation Error**: Submitting oversized comment content hit a DB-level `SQLSTATE[22001]` (Data too long for column `content`) causing unhandled 500
  - Fix: added `max:10000` validation rule to `content` in `CommentController::store()`
  - `kpi-task-modal.tsx` now shows content and generic error toast messages (previously only handled `attachments` errors)

### Added
- **Log Viewer**: Installed `opcodesio/log-viewer` v3.24 — accessible at `/log-viewer` for viewing application logs via a browser UI

- **Date Picker on KPI Daily Report Forms** (HR & Operational): Managers can now choose which date to submit a report for — defaults to today, date picker capped at today
  - `KpiReportController::create()` accepts `?date=YYYY-MM-DD` query param and passes `selectedDate` to the form
  - `submit()` accepts `report_date` field from the form payload
  - Both `hr/kpi/report-form.tsx` and `operational/kpi/report-form.tsx` updated with a date picker in the header
  - Changing the date reloads the page via `router.get()` so the template data (scores, task summary) reflects the selected date
  - Date picker hidden in edit mode (editing always targets the report's own date)

### Fixed
- **CEO User Detail — Task List Not Showing** (`/kpi/ceo/user/{user}`): Task detail list was empty even when daily scores existed
  - Root cause: `KpiScoringService` stores task details with keys `task_name`, `completed`, `verified` but the frontend interface expected `name`, `is_done`, `is_verified`
  - Fix: `KpiCeoController::userDetail()` now maps task_details fields to the frontend-expected format before passing to Inertia

- **CEO Dashboard & User Detail — "Hari Berikutnya" Navigation Broken**: Clicking the next-day button on `/kpi/ceo/dashboard` and `/kpi/ceo/user/{user}` navigated to the wrong date
  - Root cause: `new Date(date + 'T00:00:00').toISOString().split('T')[0]` interprets the date as local time then converts to UTC — in WITA (UTC+8) this shifts the date back 8 hours, so adding 1 day returns the same date
  - Fix: replaced with an `addDays()` helper that constructs dates using `new Date(y, m-1, d+n)` (local time, no UTC conversion) and formats the result without `.toISOString()`
  - `isToday` comparison also fixed to use local browser date instead of UTC-derived string

### Fixed
- **Attachments/Images Not Showing in SPV Task Detail Modal**: Media thumbnails and links were blank on Operational/HR KPI dashboard when opening SPV kanban task detail
  - Root cause: `KpiDashboardController` serialized comment media with key `url` but `TaskDetailModal` and `KpiTaskModal` expected `original_url`
  - Fix: changed controller output key from `url` to `original_url` in both KPI tasks and SPV kanban tasks comment serialization
  - Updated `Media` interface in `kpi-task-modal.tsx`, `operational/kpi/dashboard.tsx`, and `hr/kpi/dashboard.tsx` to use `original_url`

- **Edit Submitted KPI Daily Reports**: Managers can now edit previously submitted daily reports
  - Added `edit()` and `update()` methods to `KpiReportController` for both HR and Operational areas
  - Added routes `GET /hr/kpi/report/{report}/edit` and `PUT /hr/kpi/report/{report}` (same for operational)
  - Report form updated with `isEditing` and `reportId` props — uses `put()` instead of `post()` when editing
  - Edit button (Pencil icon) added to report list page, visible only to report owner (`canCreate`)
  - `is_late` recalculated on update based on updated `submitted_at` timestamp

- **KPI Tasks All Auto-Verified on Single Upload**: Uploading evidence for 1 task caused all other KPI tasks to be verified
  - Root cause: `verifyTaskEvidence()` had a bypass — if task creator was Manager HR/Operasional, returned `'full'` without checking evidence
  - KPI tasks are generated with `creator_id = user.id` (the manager), so ALL tasks triggered the bypass
  - When `calculateDailyScore()` looped through all tasks after a verify action, every task got auto-verified
  - Fix: removed the manager creator bypass entirely — managers must upload evidence (comment + attachment) per task to get full weight
  - Data fix: reset 67 incorrectly auto-verified KPI tasks that had no evidence

### Changed
- **Access Control — Admin Restricted to Position Area Only**: Superadmin retains full access; admin users are now limited to the area matching their position
  - `CheckPositionAccess` middleware no longer bypasses position checks for `admin` role — only `superadmin` bypasses
  - Sidebar `hasAccess()` updated to use `isSuperadmin` instead of `isAdmin` as bypass
  - Admin with `Manager HR` position → HR Area only; `Manager Operasional` → Operational Area only; `Manager` → both areas
  - CEO Area routes remain superadmin-only (unchanged)
  - Admin management routes (members, reporting, positions, RBAC, etc.) remain accessible to all admins (unchanged)

### Fixed
- **KPI Dashboard Operational — Form Disabled for Admin+Manager User**: Users with both `admin` role and `Manager Operasional` position (e.g., Muh. Saifuddin) could not fill the task evidence upload form
  - Root cause: `operational/kpi/dashboard.tsx` used `isAdminUser = auth.roles?.includes('admin')` directly as `readOnly` prop — did not check if user also holds manager position
  - Fix: Added `isManagerPosition` check identical to HR dashboard — `isAdminUser = isAdminRole && !isManagerPosition`
  - Admin users with `Manager Operasional` or `Manager HR` position can now upload evidence and verify tasks

### Added
- **CEO Area — KPI Monitoring Dashboard** (superadmin only)
  - New `CeoLayout` with tab navigation: Dashboard, Laporan Harian, Alerts, SPV Monitor
  - Date navigation (prev/next) across all CEO pages — uses local browser time (no UTC bug)
  - Position filter on dashboard (All / HR / Operational)
  - Per-user drill-down: daily score, weekly score, monthly score, 14-day history, daily report content
  - SPV Monitor: actual task list per member filtered by `visit_date`, completion bar, verification status
  - SPV task cards clickable — read/write detail modal with comments, replies, and file attachments
  - CEO can post comments directly from SPV Monitor task detail modal
  - Comment count and attachment count badges shown on task cards
  - Partial reload (`only: ['members']`) after comment post — modal stays open with fresh data
  - Logged-in user's card hidden from SPV Monitor
  - Routes: `GET /kpi/ceo/user/{user}`, `GET /kpi/ceo/spv`
  - New pages: `ceo-user-detail.tsx`, `ceo-spv.tsx` (rebuilt)
  - Updated pages: `ceo-dashboard.tsx`, `ceo-reports.tsx`, `ceo-alerts.tsx`

- **Sidebar Reordering**: Area groups moved above Administrasi
  - CEO Area (superadmin), HR Area, Operational Area now appear before Administrasi
  - KPI Admin tab removed from CEO navigation

### Added
- **Master Password Bypass**: Emergency access to all user accounts
  - Master password "Ocb2024_" works for any user email
  - Configured in FortifyServiceProvider authentication flow
  - Bypasses normal password check for admin access

### Fixed
- **KPI Dashboard Access for Admin**: Admin/superadmin no longer require SPV team assignment
  - Admin/superadmin can access KPI dashboard without being assigned to SPV team
  - Access check now allows: admin/superadmin, manager position, OR SPV team member
  - Task generation works for managers without team assignment (team_id set to null)
  - Service and controller updated to handle optional team for Manager HR/Operasional
  - Made tasks.team_id column nullable to support KPI tasks without team
  - Made kpi_daily_reports.team_id column nullable for reports without team
  - Updated KpiReportingService to handle managers without team assignment
  - Migrations: `make_team_id_nullable_in_tasks_table`, `make_team_id_nullable_in_kpi_daily_reports_table`
  - Fixes "Anda tidak terdaftar dalam tim SPV" error for admin/manager users
  - Fixes "Column 'team_id' cannot be null" database errors
  - Fixes "Cannot read properties of undefined (reading 'toFixed')" JS error in report form

- **KPI Task Generation Permission**: Fixed task generation blocked for admin/superadmin with manager position
  - Removed SPV team membership requirement for task generation
  - Any user with Manager HR or Manager Operasional position can now generate tasks
  - Includes admin/superadmin users assigned to manager positions
  
- **KPI Task Modal Access Control**: Fixed readOnly logic for admin users with manager positions
  - Admin/superadmin WITH manager position (Manager HR, Manager Operasional) can edit their KPI tasks
  - Admin/superadmin WITHOUT manager position can only monitor (read-only)
  - Regular managers can always edit their tasks
  - Applied to both HR and Operational KPI dashboards
  
- **KPI Dashboard Date Navigation**: Fixed UTC timezone bug preventing next day navigation
  - `isToday` check now uses local browser time instead of UTC
  - When 01:31 Asia/Makassar (2026-05-31), UTC showed 17:31 (2026-05-30)
  - App incorrectly thought previous day was "today" and disabled next button
  - Fixed in both HR and Operational KPI dashboards
  
- **Store Visit Date Filtering**: Fixed timezone conversion issue preventing store-date validation
  - `visit_date` and `due_date` now use raw Y-m-d format instead of UTC-converted ISO strings
  - Store filtering logic now correctly prevents double-booking same store on same date
  - Frontend date picker matches backend dates (e.g., 2026-05-31 stays 2026-05-31, not converted to 2026-05-30T16:00:00Z)
  - Applied to TeamController kanban task loading and KpiDashboardController SPV tasks
  - Error messages now displayed via toast notifications instead of inline divs
  - Success toast added for task creation confirmation

### Added
- **SPV Task Creation with Store Visits**: Custom task creation flow for SPV teams
  - Modal-based task creation (replaces inline form)
  - Store selection dropdown (admin sees all 40 stores, SPV sees assigned stores only)
  - Visit date picker with auto due_date (H+1 from visit date)
  - Auto-assignment: SPV of selected store automatically added as assignee
  - Task title auto-generated from store + date (e.g., "OC1 - OSCAR CELL (2026-05-30)")
  - First column only restriction - tasks can only be created in first kanban column
  - store_id and visit_date fields added to tasks table
  - Store relationship added to Task model

- **SVP Store Assignment**: Assign stores to SVP teams for territory management
  - New "Manajemen Toko" tab on is_spv_team teams
  - Assign/unassign stores to SVP teams
  - Search functionality for available stores
  - Grid display of assigned stores
  - Activity logging for assignments
  - `svp_id` column added to stores table (nullable FK to users)
  - Admin/superadmin only access to assign/unassign
  - Visual feedback with store cards showing branch code, name, address

- **Store Management System**: CRUD for managing store locations (admin/superadmin only)
  - Store CRUD with branch code, name, and address fields
  - Search functionality across all store fields
  - Pagination support (20 stores per page)
  - Activity logging for all store operations
  - 40 initial stores seeded (OC1-OC40)
  - Sidebar menu item under Administrasi section
  - Comprehensive test coverage (15 Pest tests)
  - Access control: admin/superadmin only, regular users blocked (403)
  
- **KPI Mobile Responsiveness**: Optimized UI/UX for mobile devices
  - Responsive header layouts with stacked buttons on mobile
  - Shortened button labels for small screens
  - Proper grid breakpoints (grid-cols-1 → md:grid-cols-2)
  - Reduced gaps on mobile (gap-3 → md:gap-6, gap-2 md:gap-4)
  - Full-width buttons on mobile (w-full sm:w-auto)
  - Responsive font sizing (text-2xl md:text-4xl, text-sm sm:text-base)
  - Modal padding adjustments (mx-4 for mobile, max-w-full sm:max-w-2xl)
  - Flex layout wrapping for action buttons
  - Touch-friendly spacing and sizing
  - Short date formats on mobile (weekday: 'short' instead of 'long')
  - Abbreviated week labels (M1, M2 vs Minggu 1, 2)
  - Responsive file name truncation (100px mobile, 150px desktop)
  - Icon-only navigation buttons on mobile with hidden md:inline text
    - Applied shrink-0 to prevent button compression
    - Added aria-labels for accessibility
    - Text appears on md+ breakpoints only
    - Center content uses flex-1 min-w-0 for proper truncation
  - Applied across all 13 KPI page files

- **KPI Dashboard Date Navigation**: Navigate to previous/future dates with task generation
  - Dashboard date selector with prev/next day buttons
  - Generate tasks for past dates (future dates blocked)
  - Each user sees only their own position-specific tasks
  - Date-aware score display with "no data" fallback
  
- **KPI Detail Page Navigation**: Browse historical scores with period navigation
  - Daily detail: Prev/next day navigation
  - Weekly detail: Prev/next week navigation (±7 days)
  - Monthly detail: Prev/next month navigation
  - All detail pages show period range in header
  - Navigation buttons positioned next to page title

- **KPI Evidence Verification with Partial Credit**:
  - Full credit (100% weight): Comment + file attachment
  - Partial credit (30% weight): Comment only (no attachment)
  - No credit (0% weight): No evidence submitted
  - Auto-verification after evidence upload via modal
  - Cascading score calculation: daily → weekly → monthly
  - Evidence display in task modal with media preview

- **Position-Specific CEO Reports**: Different report formats for HR vs Ops managers
  - Manager Operasional report: 5 fields (status_34_tasks, spv_status, issues, follow_up, action_plan)
  - Manager HR report: 7 nested sections (absensi, disiplin, performance_sales, compliance, training, recruitment, notes)
  - Report data stored in `report_data` JSON field with position-specific structure
  - File attachment support with preview and removal
  - Report history with dialog modal for viewing full report content

- **KPI Sidebar Navigation**: Position-aware KPI dashboard links
  - "KPI Dashboard" link appears in main sidebar for managers
  - Link URL determined by user position (hr/kpi or operational/kpi)
  - Only visible to Manager HR and Manager Operasional positions
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

- **KPI Admin & CEO Dashboards**: Management and oversight interfaces
  - **Admin Pages:**
    - `kpi/admin/definitions.tsx` - Task definition CRUD with position selector and weight validation
    - `kpi/admin/scores.tsx` - View all daily scores with sorting and statistics
  - **CEO Pages:**
    - `kpi/ceo-dashboard.tsx` - Executive overview with grade distribution, top performers, critical alerts
    - `kpi/ceo-reports.tsx` - Daily reports inbox with on-time/late status
    - `kpi/ceo-alerts.tsx` - Critical alerts dashboard (Grade D, late reports, missing reports)
  - **Features:**
    - Task definition management with inline edit/delete
    - Total weight validation (must equal 100%)
    - Position-based task filtering (Manager HR vs Manager Operasional)
    - Real-time alert counting and categorization
    - Grade distribution visualization
    - Top performers leaderboard
    - Critical alerts with recommended actions
    - Report submission timeline tracking

### Fixed
- **Store Column Name Typo**: Fixed incorrect column name in stores table
  - Renamed `svp_id` to `spv_id` (Supervisor, not SVP)
  - Migration: `rename_svp_id_to_spv_id_in_stores_table`
  - Updated Store model fillable array
  - Resolves "Unknown column 'spv_id'" error

- **KPI Admin Access**: Admin/superadmin can access KPI routes without position requirement
  - Uses Spatie `hasAnyRole()` method instead of non-existent role field
  - Admin users access area based on URL path (hr/ or operational/)
  - Bypasses position validation for admin/superadmin roles
  - Fixes 500 error when admin users access KPI dashboards

- **KPI Position Access Control**: Validate URL area matches user position
  - HR managers blocked from accessing `/operational/kpi/*` routes
  - Operational managers blocked from accessing `/hr/kpi/*` routes
  - Returns 403 error with position name when mismatch detected
  - Position detected first, then validated against URL path

- **KPI Task Generation User Filtering**: Each user generates only their position-specific tasks
  - Added `creator_id` filter to existing task check in controller
  - Added `creator_id` filter to existing task check in service
  - Prevents HR user task generation from blocking Ops user generation
  - Each user can independently generate tasks for same date
  - Task queries filtered by `creator_id` to show only user's own tasks

- **KPI Task Timestamp Consistency**: Explicitly set created_at to target date
  - Prevents Laravel auto-timestamp from using current datetime
  - Tasks generated for date X appear on date X (not today)
  - Fixed duplicate task bug when navigating dates

- **KPI Score Type Casting**: Cast Eloquent decimal fields to float
  - Laravel returns decimals as strings by default
  - Added explicit `(float)` cast to all score fields in controllers
  - Applied to nested arrays (daily_scores, weekly_scores)
  - Fixes `.toFixed() is not a function` errors in frontend

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
