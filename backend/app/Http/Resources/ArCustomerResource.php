<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ArCustomerResource extends JsonResource
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
            'balance' => (float)$this->current_balance,
            'total_debt' => (float)($this->total_debt ?? 0),
            'total_paid' => (float)($this->total_paid ?? 0),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
