<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('recurrence_limit_unit')->nullable()->after('recurrence_month_day');
            $table->unsignedInteger('recurrence_limit_value')->nullable()->after('recurrence_limit_unit');
            $table->timestamp('recurrence_ends_at')->nullable()->after('recurrence_limit_value')->index();
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn([
                'recurrence_limit_unit',
                'recurrence_limit_value',
                'recurrence_ends_at',
            ]);
        });
    }
};
