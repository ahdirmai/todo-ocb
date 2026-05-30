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
        Schema::create('kpi_weekly_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->date('week_start_date');
            $table->date('week_end_date');
            $table->decimal('average_score', 5, 2);
            $table->string('grade', 10);
            $table->json('daily_scores')->nullable();
            $table->json('category_breakdown')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'week_start_date']);
            $table->index('week_start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_weekly_scores');
    }
};
