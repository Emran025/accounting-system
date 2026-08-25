<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceOutboxEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'merchant_id' => $this->merchant_id,
            'aggregate_type' => $this->aggregate_type,
            'aggregate_id' => $this->aggregate_id,
            'event_type' => $this->event_type,
            'aggregate_revision' => $this->aggregate_revision,
            'idempotency_key' => $this->idempotency_key,
            'status' => $this->status,
            'attempts' => $this->attempts,
            'available_at' => $this->available_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'remote_receipt_id' => $this->remote_receipt_id,
            'last_error' => $this->last_error,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
