<?php

namespace App\Models;

use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

    protected $fillable = [
        'branch_code',
        'name',
        'address',
    ];
}
