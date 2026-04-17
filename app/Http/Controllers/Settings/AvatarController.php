<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AvatarController extends Controller
{
    /**
     * Upload and replace the authenticated user's avatar.
     */
    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048', 'mimes:jpeg,png,gif,webp'],
        ]);

        $request->user()
            ->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avatar updated.']);

        return to_route('profile.edit');
    }

    /**
     * Remove the authenticated user's avatar.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->clearMediaCollection('avatar');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avatar removed.']);

        return to_route('profile.edit');
    }
}
