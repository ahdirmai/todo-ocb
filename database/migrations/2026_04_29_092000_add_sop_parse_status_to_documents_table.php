<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table): void {
            $table->string('sop_parse_status')->nullable()->after('is_sop');
            $table->string('sop_parse_platform')->nullable()->after('sop_parse_status');
            $table->text('sop_parse_error')->nullable()->after('sop_parse_platform');
            $table->timestamp('sop_parse_queued_at')->nullable()->after('sop_parse_error');
            $table->timestamp('sop_parse_started_at')->nullable()->after('sop_parse_queued_at');
            $table->timestamp('sop_parse_completed_at')->nullable()->after('sop_parse_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table): void {
            $table->dropColumn([
                'sop_parse_status',
                'sop_parse_platform',
                'sop_parse_error',
                'sop_parse_queued_at',
                'sop_parse_started_at',
                'sop_parse_completed_at',
            ]);
        });
    }
};
