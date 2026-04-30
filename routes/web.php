<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentCommentController;
use App\Http\Controllers\KanbanBoardController;
use App\Http\Controllers\KanbanColumnController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\NightwatchController;
use App\Http\Controllers\ReportingController;
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
        ->where('tab', 'overview|task|chat|announcement|question|document|sop|activity')
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

        // Team Management
        Route::post('teams', [TeamController::class, 'store'])->name('teams.store');
        Route::put('teams/{team}', [TeamController::class, 'update'])->name('teams.update');
        Route::patch('teams/{team}/archive', [TeamController::class, 'archive'])->name('teams.archive');
        Route::patch('teams/{team}/restore', [TeamController::class, 'restore'])->name('teams.restore');
        Route::delete('teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');
        // Activity Logs — admin & superadmin only
        Route::get('activity', [ActivityLogController::class, 'index'])->name('activity.index');
    });
});

require __DIR__.'/settings.php';
