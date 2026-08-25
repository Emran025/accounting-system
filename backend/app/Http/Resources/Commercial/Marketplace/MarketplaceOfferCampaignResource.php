<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceOfferCampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'merchant_id' => $this->merchant_id,
            'slug' => $this->slug,
            'title' => ['ar' => $this->title_ar, 'en' => $this->title_en],
            'summary' => ['ar' => $this->summary_ar, 'en' => $this->summary_en],
            'disclosure' => ['ar' => $this->disclosure_ar, 'en' => $this->disclosure_en],
            'benefit' => [
                'type' => $this->benefit_type,
                'value' => (float) $this->benefit_value,
                'currency' => $this->currency_code,
            ],
            'hero_media_url' => $this->hero_media_url,
            'targets' => $this->targets,
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'timezone' => $this->timezone,
            'status' => $this->status,
            'published_at' => $this->published_at?->toISOString(),
            'sync' => [
                'last_synced_at' => $this->last_synced_at?->toISOString(),
                'last_error' => $this->last_sync_error,
            ],
            'revision' => $this->revision,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
