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
        Schema::create('kpi_task_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->string('category');
            $table->string('task_name');
            $table->text('description')->nullable();
            $table->text('work_method')->nullable();
            $table->text('verification_method')->nullable();
            $table->decimal('weight', 5, 2);
            $table->integer('sequence_order');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['position_id', 'is_active']);
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_task_definitions');
    }
};
