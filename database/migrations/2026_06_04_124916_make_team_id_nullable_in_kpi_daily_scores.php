<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_daily_scores', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
            $table->char('team_id', 36)->nullable()->change();
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('kpi_daily_scores', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
            $table->char('team_id', 36)->nullable(false)->change();
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
        });
    }
};
