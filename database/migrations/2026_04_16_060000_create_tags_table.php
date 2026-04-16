<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('color')->default('#6366f1'); // default indigo
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('task_tag', function (Blueprint $table) {
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['task_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_tag');
        Schema::dropIfExists('tags');
    }
};
