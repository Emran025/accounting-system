<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceInquiryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'publication_id' => $this->publication_id,
            'offer_id' => $this->offer_id,
            'product_id' => $this->product_id,
            'item_kind' => $this->item_kind,
            'public_title' => $this->public_title,
            'requested_quantity' => (float) $this->requested_quantity,
            'public_unit_price' => $this->public_unit_price === null ? null : [
                'amount' => (float) $this->public_unit_price,
                'currency' => $this->currency_code,
            ],
        ];
    }
}
