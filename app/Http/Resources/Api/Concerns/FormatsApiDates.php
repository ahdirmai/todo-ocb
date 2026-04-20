<?php

namespace App\Http\Resources\Api\Concerns;

use Carbon\CarbonInterface;

trait FormatsApiDates
{
    protected function humanizeDate(?CarbonInterface $date): ?string
    {
        return $date?->diffForHumans();
    }
}
