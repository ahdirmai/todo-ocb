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
        Schema::create('kpi_daily_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->date('report_date');
            $table->text('status_34_tasks')->nullable();
            $table->text('spv_status')->nullable();
            $table->text('issues_today')->nullable();
            $table->text('follow_up')->nullable();
            $table->text('action_plan')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->boolean('is_late')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'report_date']);
            $table->index(['report_date', 'submitted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_daily_reports');
    }
};
