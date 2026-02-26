<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->name,
            'quantity' => (float)$this->quantity,
            'invoice_price' => (float)$this->invoice_price,
            'unit_price' => $this->quantity > 0 ? round($this->invoice_price / $this->quantity, 2) : 0,
            'total_price' => (float)$this->invoice_price,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->name,
            'unit_type' => $this->unit_type,
            'production_date' => $this->production_date,
            'expiry_date' => $this->expiry_date,
            'purchase_date' => $this->purchase_date ? $this->purchase_date->toDateString() : null,
            'created_at' => $this->created_at->toDateTimeString(),
            'notes' => $this->notes,
            'voucher_number' => $this->voucher_number,
            'approval_status' => $this->approval_status,
            'is_reversed' => (bool)$this->is_reversed,
            'created_by_name' => $this->user?->username,
        ];
    }
}
