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

        // For admin monitoring, include Manager Gudang + line positions
        $positions = Position::GUDANG_LINE_POSITIONS;
        if ($request->user()->hasAnyRole(['admin', 'superadmin'])) {
            $positions = array_merge(['Manager Gudang'], $positions);
        }

        return Inertia::render('gudang/index', [
            'positionName' => $positionName,
            'isMonitoring' => ! in_array($positionName, Position::GUDANG_POSITIONS),
            'isGudangManager' => $positionName === 'Manager Gudang',
            'gudangPositions' => $positions,
        ]);
    }
}
