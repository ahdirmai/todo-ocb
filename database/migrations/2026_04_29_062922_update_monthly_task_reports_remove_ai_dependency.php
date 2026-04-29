<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the old unique constraint that includes platform
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->dropUnique(['report_month', 'platform', 'team_id']);
        });

        // Set existing records to word-match
        DB::table('monthly_task_reports')->update([
            'platform' => 'word-match',
            'model' => 'word-match-v1',
        ]);

        // Add a new unique constraint without platform
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->unique(['report_month', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->dropUnique(['report_month', 'team_id']);
        });

        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->unique(['report_month', 'platform', 'team_id']);
        });
    }
};
