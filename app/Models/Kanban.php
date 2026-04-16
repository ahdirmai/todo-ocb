<?php

namespace App\Models;

use Database\Factories\KanbanFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kanban extends Model
{
    /** @use HasFactory<KanbanFactory> */
    use HasFactory, HasUuids;

    protected $guarded = [];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function columns()
    {
        return $this->hasMany(KanbanColumn::class)->orderBy('order');
    }
}
