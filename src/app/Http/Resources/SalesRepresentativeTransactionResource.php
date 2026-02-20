<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesRepresentativeTransactionResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'sales_representative_id' => $this->sales_representative_id,
            'type' => $this->type,
            'amount' => (float)$this->amount,
            'description' => $this->description,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'transaction_date' => $this->transaction_date->toDateTimeString(),
            'created_by' => $this->created_by,
            'creator_name' => $this->createdBy?->username,
            'is_deleted' => $this->is_deleted,
            'deleted_at' => $this->deleted_at ? $this->deleted_at->toDateTimeString() : null,
        ];
    }
}
