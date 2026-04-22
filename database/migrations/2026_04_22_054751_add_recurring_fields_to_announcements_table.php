<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignUuid('source_announcement_id')
                ->nullable()
                ->after('user_id')
                ->constrained('announcements')
                ->nullOnDelete();
            $table->boolean('is_recurring')->default(false)->after('content')->index();
            $table->string('recurrence_frequency')->nullable()->after('is_recurring');
            $table->unsignedInteger('recurrence_interval')->nullable()->after('recurrence_frequency');
            $table->timestamp('next_occurrence_at')->nullable()->after('recurrence_interval')->index();
            $table->timestamp('last_generated_at')->nullable()->after('next_occurrence_at');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropForeign(['source_announcement_id']);
            $table->dropColumn([
                'source_announcement_id',
                'is_recurring',
                'recurrence_frequency',
                'recurrence_interval',
                'next_occurrence_at',
                'last_generated_at',
            ]);
        });
    }
};
