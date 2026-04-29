<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyTaskReport extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'report_month' => 'date',
            'payload' => 'array',
            'source_snapshot' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
