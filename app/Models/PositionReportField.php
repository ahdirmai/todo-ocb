<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PositionReportField extends Model
{
    protected $fillable = [
        'position_id',
        'field_key',
        'field_label',
        'field_type',
        'field_options',
        'group_label',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'field_options' => 'array',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public const TYPE_TEXT = 'text';

    public const TYPE_TEXTAREA = 'textarea';

    public const TYPE_NUMBER = 'number';

    public const TYPE_DATE = 'date';

    public const TYPE_SELECT = 'select';

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
