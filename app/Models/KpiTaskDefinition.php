<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiTaskDefinition extends Model
{
    use HasUuids;

    protected $fillable = [
        'position_id',
        'category',
        'task_name',
        'description',
        'work_method',
        'verification_method',
        'weight',
        'sequence_order',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
