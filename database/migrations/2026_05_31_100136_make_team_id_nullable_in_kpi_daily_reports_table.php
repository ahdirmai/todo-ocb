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
            $table->foreignUuid('team_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->foreignUuid('team_id')->nullable(false)->change();
        });
    }
};
