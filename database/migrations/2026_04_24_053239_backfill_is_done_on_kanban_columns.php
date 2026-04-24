<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $kanbanIds = DB::table('kanban_columns')
            ->select('kanban_id')
            ->distinct()
            ->pluck('kanban_id');

        foreach ($kanbanIds as $kanbanId) {
            $doneColumnId = DB::table('kanban_columns')
                ->where('kanban_id', $kanbanId)
                ->whereRaw('LOWER(title) like ?', ['%done%'])
                ->orderBy('order')
                ->value('id');

            DB::table('kanban_columns')
                ->where('kanban_id', $kanbanId)
                ->update([
                    'is_done' => false,
                    'updated_at' => now(),
                ]);

            if ($doneColumnId) {
                DB::table('kanban_columns')
                    ->where('id', $doneColumnId)
                    ->update([
                        'is_done' => true,
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('kanban_columns', 'is_done')) {
            return;
        }

        DB::table('kanban_columns')
            ->where('is_done', true)
            ->update([
                'is_done' => false,
                'updated_at' => now(),
            ]);
    }
};
