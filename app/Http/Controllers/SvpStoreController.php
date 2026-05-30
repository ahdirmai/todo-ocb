<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Team;
use App\Models\User;
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
            'spv_id' => 'required|exists:users,id',
        ]);

        $store = Store::findOrFail($validated['store_id']);

        if (! $team->is_spv_team) {
            return back()->withErrors(['error' => 'Tim ini bukan tim SPV.']);
        }

        // Verify SPV is member of this team
        if (! $team->users()->where('user_id', $validated['spv_id'])->exists()) {
            return back()->withErrors(['error' => 'SPV harus menjadi anggota tim ini.']);
        }

        try {
            DB::transaction(function () use ($store, $validated, $team): void {
                $store->update(['spv_id' => $validated['spv_id']]);

                $spv = User::find($validated['spv_id']);

                ActivityLogger::log(
                    event: 'assigned',
                    logName: 'store',
                    description: 'Menugaskan toko ke SPV',
                    subject: $store,
                    teamId: $team->id,
                    properties: [
                        'branch_code' => $store->branch_code,
                        'store_name' => $store->name,
                        'spv_name' => $spv->name,
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
            return back()->withErrors(['error' => 'Tim ini bukan tim SPV.']);
        }

        try {
            DB::transaction(function () use ($store, $team): void {
                $branchCode = $store->branch_code;
                $storeName = $store->name;
                $spvName = $store->spv?->name;

                $store->update(['spv_id' => null]);

                ActivityLogger::log(
                    event: 'unassigned',
                    logName: 'store',
                    description: 'Melepas toko dari SPV',
                    subject: $store,
                    teamId: $team->id,
                    properties: [
                        'branch_code' => $branchCode,
                        'store_name' => $storeName,
                        'spv_name' => $spvName,
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
