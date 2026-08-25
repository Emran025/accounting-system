<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceAuditLog extends Model
{
    use HasUuids;

    protected $table = 'marketplace_audit_logs';

    protected $fillable = [
        'event_type',
        'subject_type',
        'subject_id',
        'actor_id',
        'before_state',
        'after_state',
        'metadata',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'before_state' => 'array',
            'after_state' => 'array',
            'metadata' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
