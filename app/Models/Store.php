<?php

namespace App\Models;

use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

    protected $fillable = [
        'branch_code',
        'name',
        'address',
        'svp_id',
    ];

    public function spv(): BelongsTo
    {
        return $this->belongsTo(User::class, 'spv_id');
    }
}
