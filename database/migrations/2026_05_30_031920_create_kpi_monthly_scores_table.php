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
        Schema::create('kpi_monthly_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->date('month');
            $table->decimal('average_score', 5, 2);
            $table->decimal('consistency_bonus', 5, 2)->default(0);
            $table->decimal('final_score', 5, 2);
            $table->string('grade', 10);
            $table->boolean('has_grade_d')->default(false);
            $table->json('weekly_scores')->nullable();
            $table->json('category_breakdown')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'month']);
            $table->index('month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_monthly_scores');
    }
};
