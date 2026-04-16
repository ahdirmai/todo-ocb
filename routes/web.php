<?php

use App\Http\Controllers\KanbanBoardController;
use App\Http\Controllers\KanbanColumnController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamMemberController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Team management page (admin)
    Route::get('teams/manage', function () {
        return Inertia::render('teams/manage');
    })->middleware('role:superadmin|admin')->name('teams.manage');

    // Team routes — URL-based tab navigation
    Route::get('teams/{team:slug}/{tab?}/{item?}', [TeamController::class, 'show'])
        ->where('tab', 'overview|task|chat|announcement|question|document')
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
    Route::post('tasks/{task}/comments', [\App\Http\Controllers\CommentController::class, 'store'])->name('tasks.comments.store');
    Route::delete('comments/{comment}', [\App\Http\Controllers\CommentController::class, 'destroy'])->name('comments.destroy');
    Route::put('kanbans/tasks/reorder', [KanbanBoardController::class, 'reorderTasks'])->name('kanbans.tasks.reorder');

    // Team Member invite / remove (auth users with team access)
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('teams/{team}/members/{user}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');

    // Member Management — Superadmin & Admin only
    Route::middleware('role:superadmin|admin')->group(function () {
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
    });
});

require __DIR__.'/settings.php';
