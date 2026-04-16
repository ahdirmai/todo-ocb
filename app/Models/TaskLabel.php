<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TaskLabel extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
