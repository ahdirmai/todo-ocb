<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('log_name')->nullable()->index(); // task, comment, team, member, kanban, auth
            $table->string('event')->nullable();             // created, updated, deleted, moved, etc.
            $table->string('description');
            $table->nullableUuidMorphs('subject');             // subject_type, subject_id (uuid)
            $table->string('causer_type')->nullable()->index();
            $table->string('causer_id')->nullable()->index(); // string to handle both uuid & int PKs
            $table->json('properties')->nullable();          // {old: {}, attributes: {}}
            $table->foreignUuid('team_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
