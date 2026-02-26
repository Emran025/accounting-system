<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricDevice extends Model
{
    protected $fillable = [
        'device_name', 'device_ip', 'device_port', 'serial_number',
        'location', 'status', 'last_sync_at', 'total_records_synced',
        'is_active', 'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_sync_at' => 'datetime',
        'device_port' => 'integer',
        'total_records_synced' => 'integer',
    ];

    public function syncLogs()
    {
        return $this->hasMany(BiometricSyncLog::class, 'device_id');
    }

    public function latestSync()
    {
        return $this->hasOne(BiometricSyncLog::class, 'device_id')->latest();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
