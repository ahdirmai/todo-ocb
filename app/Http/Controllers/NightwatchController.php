<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

class NightwatchController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        abort_unless(request()->user()?->hasRole('superadmin'), 403);

        return redirect()->away(config('services.nightwatch.dashboard_url'));
    }
}
