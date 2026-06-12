<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('position_report_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('position_id')->constrained()->cascadeOnDelete();
            $table->string('field_key', 100);
            $table->string('field_label', 200);
            $table->string('field_type', 50);
            $table->json('field_options')->nullable();
            $table->string('group_label', 100)->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['position_id', 'field_key']);
            $table->index(['position_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('position_report_fields');
    }
};
