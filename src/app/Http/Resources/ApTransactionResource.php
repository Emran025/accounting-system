<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ApTransactionResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->name,
            'type' => $this->type,
            'amount' => (float)$this->amount,
            'description' => $this->description,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'transaction_date' => $this->transaction_date ? $this->transaction_date->toDateTimeString() : null,
            'created_by' => $this->createdBy?->username,
            'is_deleted' => (bool)$this->is_deleted,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
