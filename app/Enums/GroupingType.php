<?php

namespace App\Enums;

enum GroupingType: string
{
    case HQ = 'hq';
    case TEAM = 'team';
    case PROJECT = 'project';

    public function label(): string
    {
        return match ($this) {
            self::HQ => 'HQ',
            self::TEAM => 'Tim',
            self::PROJECT => 'Proyek',
        };
    }
}
