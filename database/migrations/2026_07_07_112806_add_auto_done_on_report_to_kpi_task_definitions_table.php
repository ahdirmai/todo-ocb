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
        Schema::table('kpi_task_definitions', function (Blueprint $table) {
            $table->boolean('auto_done_on_report')->default(false)->after('can_upload_proof');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpi_task_definitions', function (Blueprint $table) {
            $table->dropColumn('auto_done_on_report');
        });
    }
};
