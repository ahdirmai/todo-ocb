<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_sop_steps', function (Blueprint $table) {
            $table->text('action')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('document_sop_steps', function (Blueprint $table) {
            $table->string('action')->nullable()->change();
        });
    }
};
