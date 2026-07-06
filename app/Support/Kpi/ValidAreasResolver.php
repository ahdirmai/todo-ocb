<?php

namespace App\Support\Kpi;

use App\Models\Position;
use Illuminate\Support\Facades\Cache;

class ValidAreasResolver
{
    public const CACHE_KEY = 'kpi_valid_areas';

    public const CACHE_TTL_SECONDS = 3600;

    /**
     * Distinct area_slug values for KPI-enabled positions.
     *
     * @return array<int, string>
     */
    public static function all(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL_SECONDS,
            fn (): array => Position::query()
                ->whereNotNull('area_slug')
                ->where('has_kpi', true)
                ->distinct()
                ->orderBy('area_slug')
                ->pluck('area_slug')
                ->all()
        );
    }

    public static function isValid(string $area): bool
    {
        return in_array($area, self::all(), true);
    }

    public static function refresh(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
