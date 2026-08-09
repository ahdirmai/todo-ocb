<?php

use App\Console\Commands\DispatchRecurringAnnouncements;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(DispatchRecurringAnnouncements::class)
    ->everySecond()
    ->withoutOverlapping();

// KPI Scheduled Jobs (WITA timezone = Asia/Makassar)
//
// Daily task generation is intentionally NOT scheduled. Tasks are generated
// manually per user, gated on same-day attendance (see
// KpiDashboardController::generateTasks). A bulk 00:01 generation would run
// before anyone has checked in and would bypass the attendance gate, so it is
// disabled. The command still exists for manual/debug use.
// Schedule::command('app:kpi-generate-daily-tasks')
//     ->dailyAt('00:01')
//     ->timezone('Asia/Makassar');

Schedule::command('app:kpi-calculate-daily-scores')
    ->dailyAt('23:00')
    ->timezone('Asia/Makassar');

Schedule::command('app:kpi-send-report-reminder')
    ->dailyAt('21:00')
    ->timezone('Asia/Makassar');

Schedule::command('app:kpi-calculate-weekly-scores')
    ->weekly()
    ->mondays()
    ->at('01:00')
    ->timezone('Asia/Makassar');

Schedule::command('app:kpi-calculate-monthly-scores')
    ->monthlyOn(1, '02:00')
    ->timezone('Asia/Makassar');
