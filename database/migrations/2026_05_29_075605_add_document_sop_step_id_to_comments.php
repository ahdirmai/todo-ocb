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
        Schema::table('comments', function (Blueprint $table): void {
            $table->char('document_sop_step_id', 36)->nullable()->after('document_id');
            $table->foreign('document_sop_step_id')
                ->references('id')
                ->on('document_sop_steps')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table): void {
            $table->dropForeign(['document_sop_step_id']);
            $table->dropColumn('document_sop_step_id');
        });
    }
};
