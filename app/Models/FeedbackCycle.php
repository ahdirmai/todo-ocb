<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedbackCycle extends Model
{
    protected $fillable = [
        'is_open',
        'title',
        'description',
        'opened_at',
        'closed_at',
        'created_by',
    ];

    protected $casts = [
        'is_open' => 'boolean',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(Feedback::class, 'feedback_cycle_id');
    }
}
