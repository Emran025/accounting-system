<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Models;

use Illuminate\Database\Eloquent\Model;

class SealedTransportReplayToken extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'desktop_device_id',
        'key_id',
        'direction',
        'nonce_hash',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }
}
