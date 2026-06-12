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

        return Inertia::render('gudang/index', [
            'positionName' => $positionName,
            'isMonitoring' => ! in_array($positionName, Position::GUDANG_POSITIONS),
            'gudangPositions' => Position::GUDANG_POSITIONS,
        ]);
    }
}
