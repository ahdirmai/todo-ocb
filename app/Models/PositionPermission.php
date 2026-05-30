<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PositionPermission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'position_id',
        'route_key',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
