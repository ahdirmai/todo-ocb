<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_task_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_month');
            $table->string('platform');
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('model');
            $table->string('prompt_version')->default('v1');
            $table->unsignedInteger('source_task_count')->default(0);
            $table->json('payload');
            $table->json('source_snapshot');
            $table->timestamp('generated_at');
            $table->timestamps();

            $table->unique(['report_month', 'platform', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_task_reports');
    }
};
