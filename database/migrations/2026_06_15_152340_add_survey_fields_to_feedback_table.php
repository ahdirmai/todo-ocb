<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->foreignId('feedback_cycle_id')->nullable()->change();
            $table->json('survey_data')->nullable()->after('rating');
        });
    }

    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropColumn('survey_data');
            $table->foreignId('feedback_cycle_id')->change();
        });
    }
};
