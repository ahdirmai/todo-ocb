<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class MemberController extends Controller
{
    public function index()
    {
        $members = User::with('roles')->orderBy('name')->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'avatar_url' => $u->avatar_url,
            'position' => $u->position,
            'role' => $u->roles->first()?->name ?? 'member',
        ]);

        $roles = Role::orderBy('name')->pluck('name');

        return Inertia::render('members/index', [
            'members' => $members,
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'position' => 'nullable|string|max:255',
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'position' => $validated['position'] ?? null,
        ]);

        $user->assignRole($validated['role']);

        ActivityLogger::log(
            event: 'created',
            logName: 'member',
            description: "Anggota baru \"{$user->name}\" ({$user->email}) ditambahkan dengan role \"{$validated['role']}\"",
            subject: $user,
        );

        return back();
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'position' => 'nullable|string|max:255',
            'role' => 'required|string|exists:roles,name',
        ]);

        $oldRole = $user->roles->first()?->name ?? '-';
        $user->update([
            'position' => $validated['position'] ?? $user->position,
        ]);
        $user->syncRoles($validated['role']);

        ActivityLogger::log(
            event: 'role_changed',
            logName: 'member',
            description: "Role \"{$user->name}\" diubah dari \"{$oldRole}\" menjadi \"{$validated['role']}\"",
            subject: $user,
            properties: ['old' => ['role' => $oldRole], 'new' => ['role' => $validated['role']]],
        );

        return back();
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus akun sendiri.']);
        }

        ActivityLogger::log(
            event: 'deleted',
            logName: 'member',
            description: "Anggota \"{$user->name}\" ({$user->email}) dihapus",
            subject: $user,
        );

        $user->delete();

        return back();
    }
}
