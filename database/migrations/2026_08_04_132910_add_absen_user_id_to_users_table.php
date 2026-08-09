<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('absen_user_id')->nullable()->index()->after('email');
        });

        // Seed the mapping for users whose name matches a non-deleted record in
        // the attendance database. Cross-schema (same MySQL server); the two
        // schemas use different collations, so force one for the comparison.
        // Unmatched users keep absen_user_id = null and must be mapped by hand.
        $absenDatabase = config('database.connections.absen.database');

        DB::statement(<<<SQL
            UPDATE users k
            JOIN `{$absenDatabase}`.`user` a
              ON LOWER(TRIM(a.name)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(k.name)) COLLATE utf8mb4_unicode_ci
             AND a.is_deleted = 0
            SET k.absen_user_id = a.user_id
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('absen_user_id');
        });
    }
};
