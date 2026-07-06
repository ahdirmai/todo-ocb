<?php

use App\Models\KpiTaskDefinition;
use App\Models\Position;
use Database\Seeders\KpiSpvUnit1Seeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Seed the SPV Unit 1 KPI definitions. Runs the idempotent
     * KpiSpvUnit1Seeder so `php artisan migrate` provisions the position and
     * its 34 task definitions with zero manual seeding.
     */
    public function up(): void
    {
        (new KpiSpvUnit1Seeder)->run();
    }

    public function down(): void
    {
        $spv = Position::where('name', 'SPV Unit 1')->first();

        if ($spv) {
            KpiTaskDefinition::where('position_id', $spv->id)->delete();
        }
    }
};
