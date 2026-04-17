<?php

namespace App\Providers;

use App\Models\Comment;
use App\Models\Task;
use App\Models\Team;
use App\Observers\CommentObserver;
use App\Observers\TaskObserver;
use App\Observers\TeamObserver;
use App\Services\ActivityLogger;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerObservers();
        $this->registerAuthListeners();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Register model observers.
     */
    protected function registerObservers(): void
    {
        Task::observe(TaskObserver::class);
        Comment::observe(CommentObserver::class);
        Team::observe(TeamObserver::class);
    }

    /**
     * Register authentication event listeners for activity logging.
     */
    protected function registerAuthListeners(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            ActivityLogger::log(
                event: 'login',
                logName: 'auth',
                description: "User \"{$event->user->name}\" login",
                subject: $event->user,
                causer: $event->user,
            );
        });

        Event::listen(Logout::class, function (Logout $event): void {
            if ($event->user === null) {
                return;
            }

            ActivityLogger::log(
                event: 'logout',
                logName: 'auth',
                description: "User \"{$event->user->name}\" logout",
                subject: $event->user,
                causer: $event->user,
            );
        });
    }
}
