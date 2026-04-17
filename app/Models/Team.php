<?php

namespace App\Models;

use App\Enums\GroupingType;
use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use HasFactory, HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'grouping' => GroupingType::class,
            'is_active' => 'boolean',
        ];
    }

    public function users()
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    public function kanbans()
    {
        return $this->hasMany(Kanban::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function messages()
    {
        return $this->hasMany(TeamMessage::class);
    }

    public function announcements()
    {
        return $this->hasMany(Announcement::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }
}
