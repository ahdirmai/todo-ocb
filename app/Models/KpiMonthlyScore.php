<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiMonthlyScore extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'position_id',
        'month',
        'average_score',
        'consistency_bonus',
        'final_score',
        'grade',
        'has_grade_d',
        'weekly_scores',
        'category_breakdown',
    ];

    protected $casts = [
        'month' => 'date',
        'average_score' => 'decimal:2',
        'consistency_bonus' => 'decimal:2',
        'final_score' => 'decimal:2',
        'has_grade_d' => 'boolean',
        'weekly_scores' => 'array',
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
