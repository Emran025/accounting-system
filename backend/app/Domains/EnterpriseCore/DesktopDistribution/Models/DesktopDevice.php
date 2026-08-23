<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;

class DesktopDevice extends Model
{
    protected $fillable = [
        'device_id',
        'display_name',
        'platform',
        'client_version',
        'public_key_fingerprint',
        'certificate_fingerprint',
        'access_token_hash',
        'enrolled_at',
        'last_seen_at',
        'revoked_at',
        'revoked_reason',
    ];

    protected $hidden = [
        'access_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(DesktopDistributionAuditEvent::class);
    }

    public function transportKeys(): HasMany
    {
        return $this->hasMany(DesktopDeviceTransportKey::class);
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function acceptsAccessToken(string $accessToken): bool
    {
        return Hash::check($accessToken, $this->access_token_hash);
    }
}
