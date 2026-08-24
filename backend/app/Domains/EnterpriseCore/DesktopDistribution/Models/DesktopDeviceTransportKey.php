<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesktopDeviceTransportKey extends Model
{
    protected $fillable = [
        'desktop_device_id',
        'key_id',
        'algorithm',
        'public_key',
        'public_key_fingerprint',
        'state',
        'activated_at',
        'retire_after',
        'revoked_at',
        'revoked_reason',
    ];

    protected function casts(): array
    {
        return [
            'activated_at' => 'datetime',
            'retire_after' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(DesktopDevice::class, 'desktop_device_id');
    }

    public function scopeUsable(Builder $query): Builder
    {
        return $query
            ->whereIn('state', ['active', 'retiring'])
            ->whereNull('revoked_at')
            ->where('activated_at', '<=', now())
            ->where(function (Builder $lifecycle): void {
                $lifecycle
                    ->whereNull('retire_after')
                    ->orWhere('retire_after', '>', now());
            });
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null || $this->state === 'revoked';
    }
}
