<?php

use App\Http\Controllers\Api\TaskReadController;
use App\Http\Controllers\Api\TeamReadController;
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
