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
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignUuid('kpi_task_definition_id')->nullable()
                ->after('creator_id')
                ->constrained('kpi_task_definitions')
                ->nullOnDelete();
            $table->boolean('is_kpi_task')->default(false)->after('kpi_task_definition_id');
            $table->boolean('is_verified')->default(false)->after('is_kpi_task');
            $table->timestamp('verified_at')->nullable()->after('is_verified');

            $table->index(['is_kpi_task', 'team_id']);
            $table->index('kpi_task_definition_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['kpi_task_definition_id']);
            $table->dropIndex(['is_kpi_task', 'team_id']);
            $table->dropIndex(['kpi_task_definition_id']);
            $table->dropColumn([
                'kpi_task_definition_id',
                'is_kpi_task',
                'is_verified',
                'verified_at',
            ]);
        });
    }
};
