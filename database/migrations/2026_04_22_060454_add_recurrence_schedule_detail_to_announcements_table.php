<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->time('recurrence_time')->nullable()->after('recurrence_interval');
            $table->unsignedTinyInteger('recurrence_weekday')->nullable()->after('recurrence_time');
            $table->unsignedTinyInteger('recurrence_month_day')->nullable()->after('recurrence_weekday');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn([
                'recurrence_time',
                'recurrence_weekday',
                'recurrence_month_day',
            ]);
        });
    }
};
