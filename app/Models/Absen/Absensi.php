<?php

namespace App\Models\Absen;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Read-only view of an attendance tap in the external `absen_management`
 * database. One row per check-in/check-out event.
 *
 * @property int $absensi_id
 * @property int $user_id
 * @property Carbon $absen_time
 * @property int $status_absen
 * @property int|null $is_valid
 */
class Absensi extends Model
{
    protected $connection = 'absen';

    protected $table = 'absensi';

    protected $primaryKey = 'absensi_id';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'absen_time' => 'datetime',
        ];
    }
}
