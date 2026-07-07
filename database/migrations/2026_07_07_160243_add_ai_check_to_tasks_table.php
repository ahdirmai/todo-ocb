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
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('ai_check_status')->nullable()->after('verified_at');
            $table->unsignedTinyInteger('ai_check_attempts')->default(0)->after('ai_check_status');
            $table->decimal('ai_compliance_score', 5, 2)->nullable()->after('ai_check_attempts');
            $table->text('ai_check_feedback')->nullable()->after('ai_compliance_score');
            $table->timestamp('ai_checked_at')->nullable()->after('ai_check_feedback');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'ai_check_status',
                'ai_check_attempts',
                'ai_compliance_score',
                'ai_check_feedback',
                'ai_checked_at',
            ]);
        });
    }
};
