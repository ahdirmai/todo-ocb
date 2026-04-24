<?php

namespace App\Models;

use Database\Factories\KanbanColumnFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanColumn extends Model
{
    /** @use HasFactory<KanbanColumnFactory> */
    use HasFactory, HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_done' => 'boolean',
        ];
    }

    public function kanban()
    {
        return $this->belongsTo(Kanban::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class)->orderBy('order_position');
    }
}
