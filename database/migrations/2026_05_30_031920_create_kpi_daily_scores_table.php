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
        Schema::create('kpi_daily_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->date('score_date');
            $table->decimal('total_score', 5, 2)->default(0);
            $table->decimal('completed_weight', 5, 2)->default(0);
            $table->decimal('total_weight', 5, 2)->default(100);
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->integer('verified_tasks')->default(0);
            $table->string('grade', 10);
            $table->json('category_breakdown')->nullable();
            $table->json('task_details')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'score_date']);
            $table->index(['score_date', 'team_id']);
            $table->index(['user_id', 'score_date']);
            $table->index('grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_daily_scores');
    }
};
