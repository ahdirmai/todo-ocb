<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentCommentController;
use App\Http\Controllers\GudangController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\KanbanBoardController;
use App\Http\Controllers\KanbanColumnController;
use App\Http\Controllers\KpiAdminController;
use App\Http\Controllers\KpiCeoController;
use App\Http\Controllers\KpiDashboardController;
use App\Http\Controllers\KpiReportController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\NightwatchController;
use App\Http\Controllers\OperationalController;
use App\Http\Controllers\PengawasSvpController;
use App\Http\Controllers\PositionAccessController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\ReportingController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\SvpStoreController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamDocumentController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TeamMessageController;
use App\Http\Controllers\TeamSopController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('nightwatch', [NightwatchController::class, '__invoke'])
        ->middleware('role:superadmin')
        ->name('nightwatch');

    // Team management page (admin)
    Route::get('teams/manage', function () {
        return Inertia::render('teams/manage');
    })->middleware('role:superadmin|admin')->name('teams.manage');

    // Team routes — URL-based tab navigation
    Route::get('teams/{team:slug}/{tab?}/{item?}', [TeamController::class, 'show'])
        ->where('tab', 'overview|task|chat|announcement|question|document|sop|activity|svp-stores')
        ->name('teams.show');

    // Kanban Column CRUD
    Route::post('kanbans/{kanban}/columns', [KanbanColumnController::class, 'store'])->name('kanbans.columns.store');
    Route::put('kanbans/columns/{column}', [KanbanColumnController::class, 'update'])->name('kanbans.columns.update');
    Route::delete('kanbans/columns/{column}', [KanbanColumnController::class, 'destroy'])->name('kanbans.columns.destroy');
    Route::put('kanbans/columns/reorder', [KanbanBoardController::class, 'reorderColumns'])->name('kanbans.columns.reorder');

    // Task CRUD
    Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::get('tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
    Route::put('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
    Route::post('tasks/{task}/comments', [CommentController::class, 'store'])->name('tasks.comments.store');
    Route::put('comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
    Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
    Route::put('kanbans/tasks/reorder', [KanbanBoardController::class, 'reorderTasks'])->name('kanbans.tasks.reorder');

    // Team Chat
    Route::get('teams/{team}/messages', [TeamMessageController::class, 'index'])->name('teams.messages.index');
    Route::post('teams/{team}/messages', [TeamMessageController::class, 'store'])->name('teams.messages.store');
    Route::get('team-messages/{message}/media/{media}', [TeamMessageController::class, 'download'])->name('team-messages.download');

    // Team Member invite / remove (auth users with team access)
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('teams/{team}/members/{user}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
    Route::get('teams/{team}/mention-users', [TeamMemberController::class, 'mentionList'])->name('teams.mention-users');

    // Announcements
    Route::post('teams/{team}/announcements', [AnnouncementController::class, 'store'])->name('teams.announcements.store');
    Route::put('announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
    Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    Route::post('announcements/{announcement}/comments', [CommentController::class, 'storeAnnouncement'])->name('announcements.comments.store');

    // Documents
    Route::get('teams/{team:slug}/documents', [TeamDocumentController::class, 'index'])->name('documents.index');
    Route::get('teams/{team:slug}/documents/create', [TeamDocumentController::class, 'create'])->name('documents.create');
    Route::post('teams/{team:slug}/documents/folder', [TeamDocumentController::class, 'storeFolder'])->name('documents.folder.store');
    Route::post('teams/{team:slug}/documents/file', [TeamDocumentController::class, 'storeFile'])->name('documents.file.store');
    Route::post('teams/{team:slug}/documents/document', [TeamDocumentController::class, 'storeDocument'])->name('documents.document.store');
    Route::get('teams/{team:slug}/documents/{document}', [TeamDocumentController::class, 'show'])->name('documents.show');
    Route::get('teams/{team:slug}/documents/{document}/edit', [TeamDocumentController::class, 'edit'])->name('documents.edit');
    // Multipart form submissions still resolve here via Laravel's _method=PUT spoofing.
    Route::put('teams/{team:slug}/documents/{document}', [TeamDocumentController::class, 'update'])->name('documents.update');
    Route::post('teams/{team:slug}/documents/{document}/update-file', [TeamDocumentController::class, 'updateFile'])->name('documents.update-file');
    Route::delete('teams/{team:slug}/documents/{document}', [TeamDocumentController::class, 'destroy'])->name('documents.destroy');
    Route::post('documents/{document}/comments', [DocumentCommentController::class, 'store'])->name('documents.comments.store');
    Route::put('documents/{document}/comments/{comment}', [DocumentCommentController::class, 'update'])->name('documents.comments.update');
    Route::middleware('role:superadmin|admin')->group(function () {
        Route::post('teams/{team:slug}/sop/parse', [TeamSopController::class, 'parse'])->name('teams.sop.parse');
        Route::post('teams/{team:slug}/sop/steps', [TeamSopController::class, 'storeStep'])->name('teams.sop.steps.store');
        Route::put('teams/{team:slug}/sop/steps/reorder', [TeamSopController::class, 'reorderSteps'])->name('teams.sop.steps.reorder');
        Route::patch('teams/{team:slug}/sop/steps/{documentSopStep}', [TeamSopController::class, 'updateStep'])->name('teams.sop.steps.update');
        Route::delete('teams/{team:slug}/sop/steps/{documentSopStep}', [TeamSopController::class, 'destroyStep'])->name('teams.sop.steps.destroy');
    });

    // Member Management — Superadmin & Admin only
    Route::middleware('role:superadmin|admin')->group(function () {
        Route::get('reporting', [ReportingController::class, 'index'])->name('reporting.index');
        Route::get('reporting/{monthlyTaskReport}', [ReportingController::class, 'show'])->name('reporting.show');
        Route::post('reporting/generate', [ReportingController::class, 'generate'])->name('reporting.generate');
        Route::put('reporting/{monthlyTaskReport}', [ReportingController::class, 'update'])->name('reporting.update');
        Route::post('reporting/{monthlyTaskReport}/regenerate', [ReportingController::class, 'regenerate'])->name('reporting.regenerate');

        Route::get('members', [MemberController::class, 'index'])->name('members.index');
        Route::post('members', [MemberController::class, 'store'])->name('members.store');
        Route::put('members/{user}', [MemberController::class, 'update'])->name('members.update');
        Route::delete('members/{user}', [MemberController::class, 'destroy'])->name('members.destroy');

        Route::get('tags', [TagController::class, 'index'])->name('tags.index');
        Route::post('tags', [TagController::class, 'store'])->name('tags.store');
        Route::put('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
        Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

        Route::get('positions', [PositionController::class, 'index'])->name('positions.index');
        Route::post('positions', [PositionController::class, 'store'])->name('positions.store');
        Route::put('positions/{position}', [PositionController::class, 'update'])->name('positions.update');
        Route::delete('positions/{position}', [PositionController::class, 'destroy'])->name('positions.destroy');
        Route::post('positions/{position}/assign-user', [PositionController::class, 'assignUser'])->name('positions.assign-user');
        Route::delete('positions/{position}/remove-user', [PositionController::class, 'removeUser'])->name('positions.remove-user');
        Route::get('positions/users-without-position', [PositionController::class, 'usersWithoutPosition'])->name('positions.users-without-position');

        // RBAC - Position Access Control
        Route::get('rbac', [PositionAccessController::class, 'index'])->name('rbac.index');
        Route::post('rbac', [PositionAccessController::class, 'store'])->name('rbac.store');
        Route::delete('rbac', [PositionAccessController::class, 'destroy'])->name('rbac.destroy');

        // Team Management
        Route::post('teams', [TeamController::class, 'store'])->name('teams.store');
        Route::put('teams/{team}', [TeamController::class, 'update'])->name('teams.update');
        Route::patch('teams/{team}/archive', [TeamController::class, 'archive'])->name('teams.archive');
        Route::patch('teams/{team}/restore', [TeamController::class, 'restore'])->name('teams.restore');
        Route::patch('teams/{team}/toggle-spv', [TeamController::class, 'toggleSpvTeam'])->middleware('role:superadmin')->name('teams.toggle-spv');
        Route::delete('teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');

        // SVP Store Management — admin & superadmin only
        Route::post('teams/{team:slug}/svp-stores/assign', [SvpStoreController::class, 'assign'])->name('teams.svp-stores.assign');
        Route::post('teams/{team:slug}/svp-stores/unassign', [SvpStoreController::class, 'unassign'])->name('teams.svp-stores.unassign');
        // Activity Logs — admin & superadmin only
        Route::get('activity', [ActivityLogController::class, 'index'])->name('activity.index');

        // KPI Admin Routes — admin & superadmin only
        Route::prefix('kpi/admin')->group(function () {
            Route::get('definitions', [KpiAdminController::class, 'definitions'])->name('kpi.admin.definitions');
            Route::post('definitions', [KpiAdminController::class, 'storeDefinition'])->name('kpi.admin.definitions.store');
            Route::put('definitions/{definition}', [KpiAdminController::class, 'updateDefinition'])->name('kpi.admin.definitions.update');
            Route::delete('definitions/{definition}', [KpiAdminController::class, 'destroyDefinition'])->name('kpi.admin.definitions.destroy');
            Route::get('scores', [KpiAdminController::class, 'scores'])->name('kpi.admin.scores');
        });

        // KPI CEO Routes — superadmin only
        Route::prefix('kpi/ceo')->middleware('role:superadmin')->group(function () {
            Route::get('dashboard', [KpiCeoController::class, 'index'])->name('kpi.ceo.dashboard');
            Route::get('daily-reports', [KpiCeoController::class, 'dailyReports'])->name('kpi.ceo.reports');
            Route::get('alerts', [KpiCeoController::class, 'alerts'])->name('kpi.ceo.alerts');
            Route::get('user/{user}', [KpiCeoController::class, 'userDetail'])->name('kpi.ceo.user');
            Route::get('spv', [KpiCeoController::class, 'spvMonitoring'])->name('kpi.ceo.spv');
        });

        // Store Management — admin & superadmin only
        Route::resource('stores', StoreController::class);
    });

    // Position-Based Access Routes
    Route::get('pengawas-svp', PengawasSvpController::class)
        ->middleware('position:pengawas-svp')
        ->name('pengawas-svp.index');

    // HR Area - Manager HR
    Route::prefix('hr')->middleware('position:hr')->group(function () {
        Route::get('/', HrController::class)->name('hr.index');

        // HR KPI Routes
        Route::prefix('kpi')->group(function () {
            Route::get('dashboard', [KpiDashboardController::class, 'index'])->name('hr.kpi.dashboard');
            Route::get('daily/{date?}', [KpiDashboardController::class, 'daily'])->name('hr.kpi.daily');
            Route::get('weekly/{weekStart?}', [KpiDashboardController::class, 'weekly'])->name('hr.kpi.weekly');
            Route::get('monthly/{month?}', [KpiDashboardController::class, 'monthly'])->name('hr.kpi.monthly');
            Route::post('tasks/{task}/verify', [KpiDashboardController::class, 'verifyTask'])->name('hr.kpi.tasks.verify');
            Route::post('tasks/generate', [KpiDashboardController::class, 'generateTasks'])->name('hr.kpi.tasks.generate');

            Route::get('report/create', [KpiReportController::class, 'create'])->name('hr.kpi.report.create');
            Route::post('report/submit', [KpiReportController::class, 'submit'])->name('hr.kpi.report.submit');
            Route::get('report/{report}/edit', [KpiReportController::class, 'edit'])->name('hr.kpi.report.edit');
            Route::put('report/{report}', [KpiReportController::class, 'update'])->name('hr.kpi.report.update');
            Route::get('reports', [KpiReportController::class, 'index'])->name('hr.kpi.reports');
        });
    });

    // Gudang Area - Gudang BJB / BJM / Gesekan / ACC
    Route::prefix('gudang')->middleware('position:gudang')->group(function () {
        Route::get('/', GudangController::class)->name('gudang.index');

        // Gudang KPI Routes
        Route::prefix('kpi')->group(function () {
            Route::get('dashboard', [KpiDashboardController::class, 'index'])->name('gudang.kpi.dashboard');
            Route::get('daily/{date?}', [KpiDashboardController::class, 'daily'])->name('gudang.kpi.daily');
            Route::get('weekly/{weekStart?}', [KpiDashboardController::class, 'weekly'])->name('gudang.kpi.weekly');
            Route::get('monthly/{month?}', [KpiDashboardController::class, 'monthly'])->name('gudang.kpi.monthly');
            Route::post('tasks/{task}/verify', [KpiDashboardController::class, 'verifyTask'])->name('gudang.kpi.tasks.verify');
            Route::post('tasks/generate', [KpiDashboardController::class, 'generateTasks'])->name('gudang.kpi.tasks.generate');

            Route::get('reports', [KpiReportController::class, 'index'])->name('gudang.kpi.reports');
        });
    });

    // Operational Area - Manager Operasional
    Route::prefix('operational')->middleware('position:operational')->group(function () {
        Route::get('/', OperationalController::class)->name('operational.index');

        // Operational KPI Routes
        Route::prefix('kpi')->group(function () {
            Route::get('dashboard', [KpiDashboardController::class, 'index'])->name('operational.kpi.dashboard');
            Route::get('daily/{date?}', [KpiDashboardController::class, 'daily'])->name('operational.kpi.daily');
            Route::get('weekly/{weekStart?}', [KpiDashboardController::class, 'weekly'])->name('operational.kpi.weekly');
            Route::get('monthly/{month?}', [KpiDashboardController::class, 'monthly'])->name('operational.kpi.monthly');
            Route::post('tasks/{task}/verify', [KpiDashboardController::class, 'verifyTask'])->name('operational.kpi.tasks.verify');
            Route::post('tasks/generate', [KpiDashboardController::class, 'generateTasks'])->name('operational.kpi.tasks.generate');

            Route::get('report/create', [KpiReportController::class, 'create'])->name('operational.kpi.report.create');
            Route::post('report/submit', [KpiReportController::class, 'submit'])->name('operational.kpi.report.submit');
            Route::get('report/{report}/edit', [KpiReportController::class, 'edit'])->name('operational.kpi.report.edit');
            Route::put('report/{report}', [KpiReportController::class, 'update'])->name('operational.kpi.report.update');
            Route::get('reports', [KpiReportController::class, 'index'])->name('operational.kpi.reports');
        });
    });
});

require __DIR__.'/settings.php';
