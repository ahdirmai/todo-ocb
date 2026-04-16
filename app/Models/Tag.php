<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function tasks()
    {
        return $this->belongsToMany(Task::class, 'task_tag');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
