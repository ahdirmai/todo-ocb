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
        Schema::table('document_sop_steps', function (Blueprint $table): void {
            $table->foreignUuid('kanban_column_id')->nullable()->after('expected_column')->constrained('kanban_columns')->nullOnDelete();
            $table->unsignedSmallInteger('score_kurang')->default(1)->after('is_mandatory');
            $table->unsignedSmallInteger('score_cukup')->default(2)->after('score_kurang');
            $table->unsignedSmallInteger('score_sangat_baik')->default(3)->after('score_cukup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_sop_steps', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('kanban_column_id');
            $table->dropColumn([
                'score_kurang',
                'score_cukup',
                'score_sangat_baik',
            ]);
        });
    }
};
