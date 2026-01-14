<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'item_count' => $this->items_count ?? 0,
            'total_amount' => (float)$this->total_amount,
            'subtotal' => (float)$this->subtotal,
            'vat_amount' => (float)$this->vat_amount,
            'discount_amount' => (float)$this->discount_amount,
            'payment_type' => $this->payment_type,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer?->name,
            'amount_paid' => (float)$this->amount_paid,
            'user_id' => $this->user_id,
            'cashier_name' => $this->user?->username,
            'created_at' => $this->created_at->toDateTimeString(),
            'items' => $this->whenLoaded('items', function() {
                return $this->items->map(function($item) {
                    return [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product?->name,
                        'quantity' => $item->quantity,
                        'unit_price' => (float)$item->unit_price,
                        'subtotal' => (float)$item->subtotal,
                    ];
                });
            }),
            'zatca_status' => $this->whenLoaded('zatcaEinvoice', fn() => $this->zatcaEinvoice->status),
        ];
    }
}
