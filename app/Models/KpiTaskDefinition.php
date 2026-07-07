<?php

namespace App\Models;

use Database\Factories\KpiTaskDefinitionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiTaskDefinition extends Model
{
    /** @use HasFactory<KpiTaskDefinitionFactory> */
    use HasFactory, HasUuids;

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
        'can_upload_proof',
        'auto_done_on_report',
        'require_video_upload',
        'minimum_photos',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
        'can_upload_proof' => 'boolean',
        'auto_done_on_report' => 'boolean',
        'require_video_upload' => 'boolean',
        'minimum_photos' => 'integer',
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
