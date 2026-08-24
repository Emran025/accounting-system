<?php

namespace App\Domains\Commercial\Marketplace\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MarketplaceInboundEvent extends Model
{
    use HasUuids;

    protected $table = 'marketplace_inbound_events';

    protected $fillable = [
        'remote_event_id',
        'event_type',
        'contract_version',
        'occurred_at',
        'payload_sha256',
        'payload',
        'status',
        'handled_type',
        'handled_id',
        'receipt_id',
        'last_error',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }
}
