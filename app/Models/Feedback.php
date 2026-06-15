<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    protected $casts = [
        'rating' => 'integer',
        'survey_data' => 'array',
    ];

    protected $fillable = [
        'feedback_cycle_id',
        'user_id',
        'category',
        'subject',
        'message',
        'rating',
        'survey_data',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(FeedbackCycle::class, 'feedback_cycle_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
