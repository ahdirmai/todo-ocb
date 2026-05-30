<?php

use App\Models\Position;
use App\Models\User;
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
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignUuid('position_id')->nullable()->after('position')->constrained('positions')->nullOnDelete();
        });

        // Migrate existing position strings to positions table
        $distinctPositions = User::whereNotNull('position')
            ->where('position', '!=', '')
            ->distinct()
            ->pluck('position');

        foreach ($distinctPositions as $positionName) {
            $position = Position::create([
                'name' => $positionName,
                'description' => null,
                'created_by' => null,
            ]);

            User::where('position', $positionName)->update([
                'position_id' => $position->id,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Copy position names back from positions table to users.position
        User::whereNotNull('position_id')
            ->with('jobPosition')
            ->chunk(100, function ($users): void {
                foreach ($users as $user) {
                    $user->update(['position' => $user->jobPosition?->name]);
                }
            });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['position_id']);
            $table->dropColumn('position_id');
        });
    }
};
