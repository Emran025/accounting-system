<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceInquiryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'remote_inquiry_id' => $this->remote_inquiry_id,
            'merchant_id' => $this->merchant_id,
            'source' => $this->source,
            'channel' => $this->channel,
            'status' => $this->status,
            'customer' => [
                'name' => $this->customer_name,
                'email' => $this->customer_email,
                'phone' => $this->customer_phone,
                'preferred_language' => $this->preferred_language,
            ],
            'message' => $this->message,
            'requested_at' => $this->requested_at?->toISOString(),
            'assignment' => [
                'user_id' => $this->assigned_to,
                'assigned_at' => $this->assigned_at?->toISOString(),
            ],
            'qualification' => [
                'user_id' => $this->qualified_by,
                'qualified_at' => $this->qualified_at?->toISOString(),
            ],
            'conversion' => [
                'type' => $this->conversion_type,
                'id' => $this->conversion_id,
                'converted_by' => $this->converted_by,
                'converted_at' => $this->converted_at?->toISOString(),
            ],
            'lost_reason' => $this->lost_reason,
            'items' => MarketplaceInquiryItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
