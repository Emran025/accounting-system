<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ApSupplierResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'tax_number' => $this->tax_number,
            'current_balance' => (float)$this->current_balance,
            'payment_terms' => (int)$this->payment_terms,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
