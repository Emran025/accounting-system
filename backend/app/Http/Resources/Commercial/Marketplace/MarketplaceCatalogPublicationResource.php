<?php

namespace App\Http\Resources\Commercial\Marketplace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketplaceCatalogPublicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'merchant_id' => $this->merchant_id,
            'product_id' => $this->product_id,
            'public_slug' => $this->public_slug,
            'status' => $this->status,
            'visibility' => $this->visibility,
            'public_name' => ['ar' => $this->public_name_ar, 'en' => $this->public_name_en],
            'short_description' => ['ar' => $this->short_description_ar, 'en' => $this->short_description_en],
            'description' => ['ar' => $this->description_ar, 'en' => $this->description_en],
            'search_keywords' => $this->search_keywords ?? [],
            'cover_media_url' => $this->cover_media_url,
            'gallery_media_urls' => $this->gallery_media_urls ?? [],
            'availability' => $this->availability,
            'public_price' => $this->public_price === null ? null : [
                'amount' => (float) $this->public_price,
                'currency' => $this->currency_code,
            ],
            'unit_label' => ['ar' => $this->unit_label_ar, 'en' => $this->unit_label_en],
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
