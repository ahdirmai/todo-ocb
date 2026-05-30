<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Team;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SvpStoreController extends Controller
{
    public function assign(Request $request, Team $team): RedirectResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $store = Store::findOrFail($validated['store_id']);

        if (! $team->is_spv_team) {
            return back()->withErrors(['error' => 'Tim ini bukan tim SVP.']);
        }

        try {
            DB::transaction(function () use ($store, $team): void {
                $store->update(['svp_id' => $team->id]);

                ActivityLogger::log(
                    event: 'assigned',
                    logName: 'store',
                    description: 'Menugaskan toko ke tim SVP',
                    subject: $store,
                    teamId: $team->id,
                    properties: [
                        'branch_code' => $store->branch_code,
                        'name' => $store->name,
                        'team' => $team->name,
                    ]
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menugaskan toko, silakan coba lagi.']);
        }

        return back();
    }

    public function unassign(Request $request, Team $team): RedirectResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $store = Store::findOrFail($validated['store_id']);

        if (! $team->is_spv_team) {
            return back()->withErrors(['error' => 'Tim ini bukan tim SVP.']);
        }

        if ($store->svp_id !== $team->id) {
            return back()->withErrors(['error' => 'Toko ini tidak ditugaskan ke tim ini.']);
        }

        try {
            DB::transaction(function () use ($store, $team): void {
                $branchCode = $store->branch_code;
                $name = $store->name;

                $store->update(['svp_id' => null]);

                ActivityLogger::log(
                    event: 'unassigned',
                    logName: 'store',
                    description: 'Melepas toko dari tim SVP',
                    subject: $store,
                    teamId: $team->id,
                    properties: [
                        'branch_code' => $branchCode,
                        'name' => $name,
                        'team' => $team->name,
                    ]
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal melepas toko, silakan coba lagi.']);
        }

        return back();
    }
}
