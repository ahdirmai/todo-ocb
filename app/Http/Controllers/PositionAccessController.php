<?php

namespace App\Http\Controllers;

use App\Models\Position;
use App\Models\PositionPermission;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionAccessController extends Controller
{
    private array $availableRoutes = [
        [
            'key' => 'pengawas-svp',
            'label' => 'Pengawas SVP Area',
            'description' => 'Akses ke area pengawasan SVP',
        ],
        [
            'key' => 'hr',
            'label' => 'HR Area',
            'description' => 'Akses ke area Human Resources',
        ],
        [
            'key' => 'operational',
            'label' => 'Operational Area',
            'description' => 'Akses ke area operasional',
        ],
    ];

    public function index()
    {
        $positions = Position::with(['permissions'])
            ->orderBy('name')
            ->get()
            ->map(function ($position) {
                return [
                    'id' => $position->id,
                    'name' => $position->name,
                    'permissions' => $position->permissions->pluck('route_key')->toArray(),
                ];
            });

        return Inertia::render('rbac/index', [
            'positions' => $positions,
            'availableRoutes' => $this->availableRoutes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'position_id' => 'required|exists:positions,id',
            'route_key' => 'required|string',
        ]);

        PositionPermission::firstOrCreate([
            'position_id' => $validated['position_id'],
            'route_key' => $validated['route_key'],
        ]);

        return back();
    }

    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'position_id' => 'required|exists:positions,id',
            'route_key' => 'required|string',
        ]);

        PositionPermission::where('position_id', $validated['position_id'])
            ->where('route_key', $validated['route_key'])
            ->delete();

        return back();
    }
}
