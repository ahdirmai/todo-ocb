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
Schedule::command('app:kpi-generate-daily-tasks')
    ->dailyAt('00:01')
    ->timezone('Asia/Makassar');

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
