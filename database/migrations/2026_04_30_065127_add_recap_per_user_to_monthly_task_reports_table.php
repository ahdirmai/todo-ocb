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
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->json('recap_per_user')->nullable()->after('payload');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monthly_task_reports', function (Blueprint $table) {
            $table->dropColumn('recap_per_user');
        });
    }
};
