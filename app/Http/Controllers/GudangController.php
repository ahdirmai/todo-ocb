<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GudangController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        $positionName = $request->user()->jobPosition?->name;

        // `gudangPositions` is the user-picker list for the monitoring dropdown.
        // Phase 4: positions metadata is now data-driven via the admin UI; query
        // from DB so dropdown reflects whatever positions admins have configured.
        // Order is preserved (alphabetical) so the dropdown layout stays stable.
        $linePositions = Position::area('gudang')->where('is_manager', false)->orderBy('name')->pluck('name')->all();

        $user = $request->user();
        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            $linePositions = array_merge(['Manager Gudang'], $linePositions);
        }

        $isGudang = $user->jobPosition?->area_slug === 'gudang';

        return Inertia::render('gudang/index', [
            'positionName' => $positionName,
            'isMonitoring' => ! ($isGudang && $user->jobPosition?->is_manager),
            'isGudangManager' => (bool) $user->jobPosition?->is_manager && $isGudang,
            'gudangPositions' => $linePositions,
        ]);
    }
}
