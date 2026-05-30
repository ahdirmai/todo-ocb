# Todo App v2

Laravel-based task management system with advanced KPI tracking, position-based access control, and team collaboration features.

## Features

### Core Task Management
- **Kanban Board**: Visual task workflow with customizable columns
- **Team Collaboration**: Multi-team support with member assignments
- **Document Attachments**: File uploads with media library integration
- **Comments & Discussions**: Task-level commenting with SOP step linking
- **Monthly Reporting**: Automated monthly task aggregation and scoring
- **Store Management**: CRUD for managing store locations with search and pagination (40 stores: OC1-OC40)
- **SPV Territory Management**: Assign stores to SPV teams for territory oversight
- **SPV Task Creation**: Modal-based store visit task creation
  - Store selection (admin sees all, SPV sees assigned stores)
  - Visit date picker with auto due date (H+1)
  - Auto-assignment of store's SPV to task
  - First column only restriction

### Position Management System
- **Hierarchical Positions**: 5-tier structure (Direktur, Manager, SPV, Staff, Tim)
- **Position Groups**: Manage 17 unique positions across 5 groups
- **User Assignment**: Assign users to positions with specific role names
- **Position Permissions**: RBAC for route-level access control

### KPI Evaluation System
- **Position-Based Tracking**: Separate KPI definitions for Manager HR and Manager Operasional
- **Weighted Scoring**: Tasks weighted by importance (total 100% per position)
- **Evidence Verification**: Three-tier scoring (100% full evidence, 30% partial, 0% none)
- **Multi-Period Aggregation**: Daily → Weekly (7-day avg) → Monthly (4-week avg + bonus)
- **Automated Grading**: A+ to D grades with specific thresholds
- **CEO Reporting**: Daily report submission with deadline tracking (22:30 WITA)
- **Dashboard Analytics**: Real-time score cards, trends, and category breakdowns

### Access Control
- **Role-Based Access**: Admin, Superadmin, and User roles
- **Position-Based Routes**: Restrict access by user position
- **Protected Areas**: Pengawas SVP, HR Area, Operational Area

## Tech Stack

- **Backend**: Laravel 11, PHP 8.5
- **Frontend**: React 19, TypeScript, Inertia.js v3
- **Styling**: Tailwind CSS 4
- **Database**: MySQL/PostgreSQL
- **Testing**: Pest PHP 4
- **Dev Tools**: Laravel Herd, Vite, Pint

## Installation

```bash
# Clone repository
git clone <repository-url>
cd todo-app-v2

# Install dependencies
composer install
npm install

# Environment setup
cp .env.example .env
php artisan key:generate

# Database setup
php artisan migrate
php artisan db:seed

# Build assets
npm run build

# Start development
composer run dev
# OR
php artisan serve
npm run dev
```

## KPI System Setup

### 1. Seed KPI Task Definitions
```bash
php artisan db:seed --class=KpiTaskDefinitionSeeder
```
This seeds 50 task definitions:
- 34 tasks for Manager Operasional (20 categories)
- 16 tasks for Manager HR (12 categories)

### 2. Mark SPV Team
```bash
php artisan tinker
>>> $team = App\Models\Team::first();
>>> $team->update(['is_spv_team' => true]);
```

### 3. Assign Managers to Positions
- Navigate to `/positions` as admin
- Assign users to "Manager HR" or "Manager Operasional" positions

### 4. Generate Daily Tasks
```bash
# Manual generation
php artisan app:kpi-generate-daily-tasks

# Or use dashboard "Generate Task" button
# Automatic generation runs daily at 00:01 WITA
```

### 5. Schedule KPI Commands
Add to cron (or use Laravel scheduler):
```cron
# Generate tasks daily at 00:01 WITA
0 0 * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1
```

## KPI Grading System

| Grade | Range | Action |
|-------|-------|--------|
| A+ | 95-100% | Reward + promotion consideration |
| A | 85-94% | On target, continue monitoring |
| B | 70-84% | Needs improvement, weekly coaching |
| C | 50-69% | Warning, SP1 + 30-day plan |
| D | <50% | Critical, SP2/SP3 + evaluation |

**Monthly Consistency Bonus**: +5% if no grade D in entire month

## Evidence Requirements

| Type | Comment | Attachment | Weight |
|------|---------|------------|--------|
| Full | ✓ | ✓ | 100% |
| Partial | ✓ | ✗ | 30% |
| None | ✗ | ✗ | 0% |

## Position-Specific Routes

**Admin/Superadmin Access:**
Admin and superadmin users can access any KPI area without position requirements. Access is determined by URL path:
- `/hr/kpi/*` - HR area
- `/operational/kpi/*` - Operational area

### Manager HR
- Dashboard: `/hr/kpi/dashboard`
- Daily scores: `/hr/kpi/daily/{date}`
- Weekly scores: `/hr/kpi/weekly/{weekStart}`
- Monthly scores: `/hr/kpi/monthly/{month}`
- CEO report: `/hr/kpi/report/create`

### Manager Operasional
- Dashboard: `/operational/kpi/dashboard`
- Daily scores: `/operational/kpi/daily/{date}`
- Weekly scores: `/operational/kpi/weekly/{weekStart}`
- Monthly scores: `/operational/kpi/monthly/{month}`
- CEO report: `/operational/kpi/report/create`

### Admin/CEO (Superadmin only)
- Task definitions: `/kpi/admin/definitions`
- All scores: `/kpi/admin/scores`
- CEO dashboard: `/kpi/ceo/dashboard`
- Daily reports: `/kpi/ceo/daily-reports`
- Alerts: `/kpi/ceo/alerts`

## Testing

```bash
# Run all tests
php artisan test

# Run specific test suite
php artisan test --filter=KpiTest

# Compact output
php artisan test --compact
```

## Development

```bash
# Watch frontend changes
npm run dev

# Format PHP code
vendor/bin/pint

# Type checking
npx tsc --noEmit
```

## Scheduled Jobs

| Command | Schedule | Purpose |
|---------|----------|---------|
| `app:kpi-generate-daily-tasks` | Daily 00:01 WITA | Generate KPI tasks from templates |
| `app:kpi-calculate-daily-scores` | Daily 23:00 WITA | Calculate daily scores after deadline |
| `app:kpi-send-report-reminder` | Daily 21:00 WITA | Remind managers to submit reports |
| `app:kpi-calculate-weekly-scores` | Monday 01:00 WITA | Aggregate weekly scores |
| `app:kpi-calculate-monthly-scores` | 1st of month 02:00 WITA | Aggregate monthly scores with bonus |

## Timezone

All KPI operations use **Asia/Makassar (WITA, UTC+8)** timezone.

**Date Handling**: 
- Store visit dates (`visit_date`) and due dates (`due_date`) are stored as date-only values (Y-m-d format) to prevent timezone conversion issues
- Backend transmits raw database values instead of Carbon instances to ensure consistency
- Frontend date comparisons use local browser time, not UTC (e.g., `isToday` check)
- This prevents UTC/local timezone mismatches that could disable UI elements incorrectly

## License

Proprietary. All rights reserved.
