<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom metadata KPI ke tabel positions.
     *
     * Tujuan: menjadikan `Position` sebagai single source of truth untuk
     * pertanyaan "apakah posisi ini perlu KPI?", "manager atau line staff?",
     * "area mana?" — sehingga menghilangkan 30+ hardcoded position lists
     * di service & controller.
     *
     * Lihat: docs/daily-task-dynamic/01-audit.md & 03-phase-1.md
     */
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table): void {
            $table->boolean('has_kpi')->default(false)->after('description');
            $table->boolean('is_manager')->default(false)->after('has_kpi');
            $table->string('area_slug', 64)->nullable()->after('is_manager');
            $table->boolean('requires_spv_team')->default(true)->after('area_slug');

            $table->index('has_kpi');
            $table->index('area_slug');
        });

        $this->fillKpiMetadata();
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table): void {
            $table->dropIndex(['has_kpi']);
            $table->dropIndex(['area_slug']);
            $table->dropColumn(['has_kpi', 'is_manager', 'area_slug', 'requires_spv_team']);
        });
    }

    /**
     * Backfill existing positions dengan metadata yang konsisten dengan
     * hardcoded arrays lama — supaya tidak ada regression.
     */
    private function fillKpiMetadata(): void
    {
        DB::table('positions')->where('name', 'Manager HR')->update([
            'has_kpi' => true,
            'is_manager' => true,
            'area_slug' => 'hr',
            'requires_spv_team' => false,
        ]);

        DB::table('positions')->where('name', 'Manager Operasional')->update([
            'has_kpi' => true,
            'is_manager' => true,
            'area_slug' => 'operational',
            'requires_spv_team' => false,
        ]);

        DB::table('positions')->where('name', 'Manager Gudang')->update([
            'has_kpi' => true,
            'is_manager' => true,
            'area_slug' => 'gudang',
            'requires_spv_team' => false,
        ]);

        DB::table('positions')->whereIn('name', [
            'Gudang BJB',
            'Gudang BJM',
            'Gudang Gesekan',
            'Gudang ACC',
            'Kurir',
        ])->update([
            'has_kpi' => true,
            'is_manager' => false,
            'area_slug' => 'gudang',
            'requires_spv_team' => false,
        ]);
    }
};
