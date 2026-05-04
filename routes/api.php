<?php

use App\Http\Controllers\Api\TaskReadController;
use App\Http\Controllers\Api\TeamReadController;
use App\Http\Controllers\Api\V1\AnnouncementController as V1AnnouncementController;
use App\Http\Controllers\Api\V1\AuthController as V1AuthController;
use App\Http\Controllers\Api\V1\CommentController as V1CommentController;
use App\Http\Controllers\Api\V1\DashboardController as V1DashboardController;
use App\Http\Controllers\Api\V1\DocumentController as V1DocumentController;
use App\Http\Controllers\Api\V1\MonthlyTaskReportController as V1MonthlyTaskReportController;
use App\Http\Controllers\Api\V1\TagController as V1TagController;
use App\Http\Controllers\Api\V1\TaskController as V1TaskController;
use App\Http\Controllers\TeamMessageController;
use Illuminate\Support\Facades\Route;

Route::as('api.')
    ->group(function () {
        Route::get('teams', [TeamReadController::class, 'index'])->name('teams.index');
        Route::get('teams/{team}', [TeamReadController::class, 'show'])->name('teams.show');
        Route::get('teams/{team}/context', [TeamReadController::class, 'context'])->name('teams.context');
        Route::get('teams/{team}/digest', [TeamReadController::class, 'digest'])->name('teams.digest');
        Route::get('teams/{team}/members', [TeamReadController::class, 'members'])->name('teams.members.index');
        Route::get('teams/{team}/kanbans', [TeamReadController::class, 'kanbans'])->name('teams.kanbans.index');
        Route::get('teams/{team}/tasks', [TaskReadController::class, 'index'])->name('teams.tasks.index');
        Route::get('tasks/{task}', [TaskReadController::class, 'show'])->name('tasks.show');
        Route::get('teams/{team}/documents', [TeamReadController::class, 'documents'])->name('teams.documents.index');
        Route::get('documents/{document}', [TeamReadController::class, 'document'])->name('documents.show');
        Route::get('teams/{team}/announcements', [TeamReadController::class, 'announcements'])->name('teams.announcements.index');
        Route::get('announcements/{announcement}', [TeamReadController::class, 'announcement'])->name('announcements.show');
        Route::get('teams/{team}/messages', [TeamReadController::class, 'messages'])->name('teams.messages.index');
        Route::get('teams/{team}/activity-logs', [TeamReadController::class, 'activityLogs'])->name('teams.activity-logs.index');
        Route::get('teams/{team}/search', [TeamReadController::class, 'search'])->name('teams.search');
        Route::get('teams/{team}/entity-map', [TeamReadController::class, 'entityMap'])->name('teams.entity-map');
        Route::post('teams/{team}/resolve-references', [TeamReadController::class, 'resolveReferences'])->name('teams.resolve-references');
    });

Route::prefix('v1/internal')
    ->as('api.v1.internal.')
    ->middleware('secret')
    ->withoutMiddleware(['auth:sanctum', 'auth'])
    ->group(function () {
        Route::get('reports/monthly-tasks', [V1MonthlyTaskReportController::class, 'internalIndex'])
            ->name('reports.monthly-tasks.index');
        Route::get('reports/monthly-tasks/recap-per-user', [V1MonthlyTaskReportController::class, 'internalRecapPerUser'])
            ->name('reports.monthly-tasks.recap-per-user');
    });

Route::prefix('v1')
    ->as('api.v1.')
    ->group(function () {
        Route::post('auth/login', [V1AuthController::class, 'login'])->name('auth.login');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('auth/logout', [V1AuthController::class, 'logout'])->name('auth.logout');
            Route::get('me', [V1AuthController::class, 'me'])->name('me.show');
            Route::get('me/teams', [V1AuthController::class, 'teams'])->name('me.teams.index');
            Route::get('dashboard', V1DashboardController::class)->name('dashboard.show');
            Route::get('tags', [V1TagController::class, 'index'])->name('tags.index');

            Route::get('teams/{team}/context', [TeamReadController::class, 'context'])
                ->can('view', 'team')
                ->name('teams.context');
            Route::get('teams/{team}/kanbans', [TeamReadController::class, 'kanbans'])
                ->can('view', 'team')
                ->name('teams.kanbans.index');

            Route::get('teams/{team}/tasks', [TaskReadController::class, 'index'])
                ->can('view', 'team')
                ->name('teams.tasks.index');
            Route::get('tasks/{task}', [TaskReadController::class, 'show'])
                ->can('view', 'task')
                ->name('tasks.show');
            Route::post('tasks', [V1TaskController::class, 'store'])->name('tasks.store');
            Route::patch('tasks/{task}', [V1TaskController::class, 'update'])->name('tasks.update');
            Route::delete('tasks/{task}', [V1TaskController::class, 'destroy'])->name('tasks.destroy');
            Route::post('kanbans/tasks/reorder', [V1TaskController::class, 'reorder'])->name('kanbans.tasks.reorder');

            Route::post('tasks/{task}/comments', [V1CommentController::class, 'storeTask'])->name('tasks.comments.store');
            Route::post('announcements/{announcement}/comments', [V1CommentController::class, 'storeAnnouncement'])->name('announcements.comments.store');
            Route::patch('comments/{comment}', [V1CommentController::class, 'update'])->name('comments.update');
            Route::delete('comments/{comment}', [V1CommentController::class, 'destroy'])->name('comments.destroy');

            Route::get('teams/{team}/messages', [TeamReadController::class, 'messages'])
                ->can('view', 'team')
                ->name('teams.messages.index');
            Route::post('teams/{team}/messages', [TeamMessageController::class, 'store'])->name('teams.messages.store');

            Route::get('teams/{team}/announcements', [TeamReadController::class, 'announcements'])
                ->can('view', 'team')
                ->name('teams.announcements.index');
            Route::get('announcements/{announcement}', [TeamReadController::class, 'announcement'])
                ->can('view', 'announcement')
                ->name('announcements.show');
            Route::post('teams/{team}/announcements', [V1AnnouncementController::class, 'store'])->name('teams.announcements.store');
            Route::patch('announcements/{announcement}', [V1AnnouncementController::class, 'update'])->name('announcements.update');
            Route::delete('announcements/{announcement}', [V1AnnouncementController::class, 'destroy'])->name('announcements.destroy');

            Route::get('teams/{team}/documents', [TeamReadController::class, 'documents'])
                ->can('view', 'team')
                ->name('teams.documents.index');
            Route::get('documents/{document}', [TeamReadController::class, 'document'])
                ->can('view', 'document')
                ->name('documents.show');
            Route::post('teams/{team}/documents/folders', [V1DocumentController::class, 'storeFolder'])->name('teams.documents.folders.store');
            Route::post('teams/{team}/documents/files', [V1DocumentController::class, 'storeFile'])->name('teams.documents.files.store');
            Route::post('teams/{team}/documents/pages', [V1DocumentController::class, 'storePage'])->name('teams.documents.pages.store');
            Route::patch('teams/{team}/documents/{document}', [V1DocumentController::class, 'update'])->name('teams.documents.update');
            Route::post('teams/{team}/documents/{document}/file-version', [V1DocumentController::class, 'storeFileVersion'])->name('teams.documents.file-version.store');
            Route::delete('teams/{team}/documents/{document}', [V1DocumentController::class, 'destroy'])->name('teams.documents.destroy');

            Route::middleware('role:superadmin|admin')->group(function () {
                Route::get('reports/monthly-tasks', [V1MonthlyTaskReportController::class, 'index'])
                    ->name('reports.monthly-tasks.index');
                Route::get('reports/monthly-tasks/show', [V1MonthlyTaskReportController::class, 'show'])
                    ->name('reports.monthly-tasks.show');
                Route::get('reports/monthly-tasks/recap-per-user', [V1MonthlyTaskReportController::class, 'recapPerUser'])
                    ->name('reports.monthly-tasks.recap-per-user');
            });
        });
    });
