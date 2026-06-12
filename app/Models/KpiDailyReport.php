<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiDailyReport extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'team_id',
        'report_date',
        'fields',
        'report_data',
        'attachments',
        'submitted_at',
        'is_late',
    ];

    protected $casts = [
        'report_date' => 'date',
        'fields' => 'array',
        'report_data' => 'array',
        'attachments' => 'array',
        'submitted_at' => 'datetime',
        'is_late' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
