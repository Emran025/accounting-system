<?php

namespace App\Domains\Commercial\Marketplace\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceOutboxEvent extends Model
{
    use HasUuids;

    protected $table = 'marketplace_outbox_events';

    protected $fillable = [
        'merchant_id',
        'aggregate_type',
        'aggregate_id',
        'event_type',
        'aggregate_revision',
        'idempotency_key',
        'payload',
        'status',
        'attempts',
        'available_at',
        'delivered_at',
        'remote_receipt_id',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'attempts' => 'integer',
            'available_at' => 'datetime',
            'delivered_at' => 'datetime',
            'aggregate_revision' => 'integer',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class, 'merchant_id');
    }

    public function markDelivered(string $receiptId): void
    {
        $this->forceFill([
            'status' => 'delivered',
            'delivered_at' => now(),
            'remote_receipt_id' => $receiptId,
            'last_error' => null,
        ])->save();
    }
}
