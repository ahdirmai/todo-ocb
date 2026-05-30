<?php

namespace App\Http\Middleware;

use App\Models\PositionPermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPositionAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $routeKey): Response
    {
        $user = $request->user();

        // Superadmin and admin bypass position checks
        if ($user->hasRole(['superadmin', 'admin'])) {
            return $next($request);
        }

        // Check if user has a position
        if (! $user->position_id) {
            abort(403, 'Akses ditolak. Anda tidak memiliki posisi yang terdaftar.');
        }

        // Check if position has permission for this route
        $hasPermission = PositionPermission::where('position_id', $user->position_id)
            ->where('route_key', $routeKey)
            ->exists();

        if (! $hasPermission) {
            abort(403, 'Akses ditolak. Posisi Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }
}
