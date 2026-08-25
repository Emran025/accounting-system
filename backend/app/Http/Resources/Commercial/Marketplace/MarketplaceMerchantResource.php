<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceMerchantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'display_name' => [
                'ar' => $this->display_name_ar,
                'en' => $this->display_name_en,
            ],
            'short_description' => [
                'ar' => $this->short_description_ar,
                'en' => $this->short_description_en,
            ],
            'logo_media_url' => $this->logo_media_url,
            'public_url' => $this->public_url,
            'status' => $this->status,
            'verified_at' => $this->verified_at?->toISOString(),
            'revision' => $this->revision,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
