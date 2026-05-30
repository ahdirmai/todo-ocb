<?php

namespace App\Http\Controllers;

use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function index()
    {
        $positions = Position::with([
            'creator:id,name',
            'users',
        ])
            ->withCount('users')
            ->orderBy('name')
            ->paginate(20);

        return Inertia::render('positions/index', [
            'positions' => $positions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:positions,name',
            'description' => 'nullable|string',
        ]);

        Position::create([
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        return back();
    }

    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => "required|string|max:255|unique:positions,name,{$position->id}",
            'description' => 'nullable|string',
        ]);

        $position->update($validated);

        return back();
    }

    public function destroy(Position $position)
    {
        // Check if any users have this position
        if ($position->users()->exists()) {
            return back()->withErrors([
                'error' => 'Tidak dapat menghapus posisi yang masih digunakan oleh user.',
            ]);
        }

        $position->delete();

        return back();
    }

    public function assignUser(Request $request, Position $position)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'nullable|string|max:255',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->update([
            'position_id' => $position->id,
            'position' => $validated['position'] ?: $user->position,
        ]);

        return back();
    }

    public function usersWithoutPosition()
    {
        $users = User::whereNull('position_id')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'position']);

        return response()->json($users);
    }

    public function removeUser(Request $request, Position $position)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->update(['position_id' => null]);

        return back();
    }
}
