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
        if (Schema::hasColumn('monthly_task_reports', 'team_id')) {
            return;
        }

        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->foreignUuid('team_id')->after('platform')->constrained()->cascadeOnDelete();
            $table->unique(['report_month', 'platform', 'team_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->dropUnique(['report_month', 'platform', 'team_id']);
            $table->dropConstrainedForeignId('team_id');
        });
    }
};
