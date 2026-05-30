<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            // Keep generic fields, add JSON for position-specific data
            $table->json('report_data')->nullable()->after('action_plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->dropColumn('report_data');
        });
    }
};
