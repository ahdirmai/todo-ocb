<?php

namespace App\Models;

use App\Support\Kpi\ValidAreasResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    use HasFactory, HasUuids;

    protected static function booted(): void
    {
        static::saved(fn () => ValidAreasResolver::refresh());
        static::deleted(fn () => ValidAreasResolver::refresh());
    }

    protected $fillable = [
        'name',
        'description',
        'created_by',
        'has_kpi',
        'is_manager',
        'area_slug',
        'requires_spv_team',
    ];

    protected $casts = [
        'has_kpi' => 'boolean',
        'is_manager' => 'boolean',
        'requires_spv_team' => 'boolean',
    ];

    // === Scopes (Phase 1: refactor hardcoded position lists) ===

    public function scopeKpiEnabled(Builder $query): Builder
    {
        return $query->where('has_kpi', true);
    }

    public function scopeManagers(Builder $query): Builder
    {
        return $query->where('is_manager', true);
    }

    public function scopeArea(Builder $query, string $slug): Builder
    {
        return $query->where('area_slug', $slug);
    }

    public function scopeLineStaff(Builder $query, ?string $areaSlug = null): Builder
    {
        $q = $query->where('is_manager', false);
        if ($areaSlug !== null) {
            $q->where('area_slug', $areaSlug);
        }

        return $q;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'position_id');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(PositionPermission::class);
    }

    public function kpiDefinitions(): HasMany
    {
        return $this->hasMany(KpiTaskDefinition::class);
    }

    public function reportFields(): HasMany
    {
        return $this->hasMany(PositionReportField::class)->orderBy('sort_order');
    }

    /**
     * A position must submit a daily report when it has at least one
     * configured report field template. This makes "who reports" fully
     * data-driven: seed a report template for a position and it becomes a
     * reporter, with no code change.
     */
    public function hasReportTemplate(): bool
    {
        return $this->reportFields()->exists();
    }
}
