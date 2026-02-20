<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesRepresentativeResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'current_balance' => (float)$this->current_balance,
            'total_sales' => (float)($this->total_sales ?? 0),
            'total_paid' => (float)($this->total_paid ?? 0),
            'created_by' => $this->created_by,
            'creator_name' => $this->createdBy?->username,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
