<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricSyncLog extends Model
{
    protected $fillable = [
        'device_id', 'sync_type', 'records_imported', 'records_failed',
        'status', 'error_message', 'initiated_by', 'started_at', 'completed_at'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'records_imported' => 'integer',
        'records_failed' => 'integer',
    ];

    public function device()
    {
        return $this->belongsTo(BiometricDevice::class, 'device_id');
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }
}
