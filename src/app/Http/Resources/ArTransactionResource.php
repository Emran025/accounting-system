<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ArTransactionResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'type' => $this->type,
            'amount' => (float)$this->amount,
            'description' => $this->description,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'transaction_date' => $this->transaction_date?->toDateTimeString(),
            'created_by' => $this->createdBy?->username,
            'is_deleted' => (bool)$this->is_deleted,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
