<?php

namespace App\Models;

use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Task extends Model implements HasMedia
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory, HasUuids, InteractsWithMedia;

    protected $guarded = [];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function kanbanColumn()
    {
        return $this->belongsTo(KanbanColumn::class);
    }

    public function labels()
    {
        return $this->hasMany(TaskLabel::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'task_tag');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_user');
    }
}
