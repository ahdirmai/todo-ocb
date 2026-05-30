<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiWeeklyScore extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'position_id',
        'week_start_date',
        'week_end_date',
        'average_score',
        'grade',
        'daily_scores',
        'category_breakdown',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'week_end_date' => 'date',
        'average_score' => 'decimal:2',
        'daily_scores' => 'array',
        'category_breakdown' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
