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
        Schema::create('position_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->string('route_key'); // 'pengawas-svp', 'hr', 'operational'
            $table->timestamps();

            $table->unique(['position_id', 'route_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('position_permissions');
    }
};
