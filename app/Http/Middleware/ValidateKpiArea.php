<?php

namespace App\Http\Middleware;

use App\Support\Kpi\ValidAreasResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the generic `{area}/kpi/*` route group. Validates that the {area}
 * segment is a real KPI area (DB-derived, cached) and that the user is
 * allowed to view it. Route-cache safe: the valid-area check runs per request
 * against ValidAreasResolver rather than being baked into the route at
 * registration time.
 */
class ValidateKpiArea
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $area = $request->route('area');

        if (! is_string($area) || ! ValidAreasResolver::isValid($area)) {
            abort(404);
        }

        $user = $request->user();

        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            return $next($request);
        }

        $position = $user->jobPosition;

        if (! $position?->has_kpi || $position->area_slug !== $area) {
            abort(403, 'Akses ditolak. Posisi Anda tidak memiliki akses ke area ini.');
        }

        return $next($request);
    }
}
