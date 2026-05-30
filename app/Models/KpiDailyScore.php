<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiDailyScore extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'position_id',
        'team_id',
        'score_date',
        'total_score',
        'completed_weight',
        'total_weight',
        'total_tasks',
        'completed_tasks',
        'verified_tasks',
        'grade',
        'category_breakdown',
        'task_details',
    ];

    protected $casts = [
        'score_date' => 'date',
        'total_score' => 'decimal:2',
        'completed_weight' => 'decimal:2',
        'total_weight' => 'decimal:2',
        'category_breakdown' => 'array',
        'task_details' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
