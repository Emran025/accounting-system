<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceMerchant;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOutboxEvent;
use App\Support\Localization\LocalizedValue;

class MarketplaceOutboxService
{
    public const CONTRACT_VERSION = 'marketplace_contract@1.0';

    public function queueMerchantEvent(MarketplaceMerchant $merchant, string $eventType): MarketplaceOutboxEvent
    {
        return $this->queue(
            merchantId: $merchant->id,
            aggregateType: 'merchant',
            aggregateId: $merchant->id,
            eventType: $eventType,
            revision: $merchant->revision,
            payload: $this->merchantSnapshot($merchant),
        );
    }

    public function queuePublicationEvent(MarketplaceCatalogPublication $publication, string $eventType): MarketplaceOutboxEvent
    {
        $publication->loadMissing(['merchant', 'product.category']);

        return $this->queue(
            merchantId: $publication->merchant_id,
            aggregateType: 'catalog_publication',
            aggregateId: $publication->id,
            eventType: $eventType,
            revision: $publication->revision,
            payload: $this->publicationSnapshot($publication),
        );
    }

    public function queueOfferEvent(MarketplaceOfferCampaign $offer, string $eventType): MarketplaceOutboxEvent
    {
        $offer->loadMissing('merchant');

        return $this->queue(
            merchantId: $offer->merchant_id,
            aggregateType: 'offer_campaign',
            aggregateId: $offer->id,
            eventType: $eventType,
            revision: $offer->revision,
            payload: $this->offerSnapshot($offer),
        );
    }

    /** @param array<string, mixed> $payload */
    private function queue(
        string $merchantId,
        string $aggregateType,
        string $aggregateId,
        string $eventType,
        int $revision,
        array $payload,
    ): MarketplaceOutboxEvent {
        $idempotencyKey = implode(':', [$eventType, $aggregateId, $revision]);

        return MarketplaceOutboxEvent::firstOrCreate(
            ['idempotency_key' => $idempotencyKey],
            [
                'merchant_id' => $merchantId,
                'aggregate_type' => $aggregateType,
                'aggregate_id' => $aggregateId,
                'event_type' => $eventType,
                'aggregate_revision' => $revision,
                'payload' => [
                    'contract_version' => self::CONTRACT_VERSION,
                    'event_type' => $eventType,
                    'occurred_at' => now()->toISOString(),
                    'producer' => [
                        'system' => 'accore',
                        'tenant_id' => (string) config('marketplace.tenant_id'),
                        'merchant_id' => $merchantId,
                    ],
                    'idempotency_key' => $idempotencyKey,
                    'payload' => $payload,
                ],
                'status' => 'pending',
                'available_at' => now(),
            ],
        );
    }

    /** @return array<string, mixed> */
    public function merchantSnapshot(MarketplaceMerchant $merchant): array
    {
        return [
            'kind' => 'merchant',
            'merchant_id' => $merchant->id,
            'revision' => $merchant->revision,
            'slug' => $merchant->slug,
            'display_name' => $this->localized($merchant->display_name_ar, $merchant->display_name_en),
            'short_description' => $this->localized($merchant->short_description_ar, $merchant->short_description_en),
            'logo_media_url' => $merchant->logo_media_url,
            'status' => $merchant->status,
            'public_url' => $merchant->public_url,
        ];
    }

    /** @return array<string, mixed> */
    public function publicationSnapshot(MarketplaceCatalogPublication $publication): array
    {
        $product = $publication->product;
        $nameAr = $publication->public_name_ar ?: $product?->name_ar;
        $nameEn = $publication->public_name_en ?: $product?->name_en;
        $descriptionAr = $publication->description_ar ?: $product?->description_ar;
        $descriptionEn = $publication->description_en ?: $product?->description_en;

        return [
            'kind' => 'product',
            'public_product_id' => $publication->id,
            'merchant_id' => $publication->merchant_id,
            'source_product_id' => (string) $publication->product_id,
            'revision' => $publication->revision,
            'slug' => $publication->public_slug,
            'catalog_code' => $product?->catalog_code,
            'name' => $this->localized($nameAr, $nameEn),
            'short_description' => $this->localized($publication->short_description_ar, $publication->short_description_en),
            'description' => $this->localized($descriptionAr, $descriptionEn),
            'category_id' => $product?->category_id ? (string) $product->category_id : null,
            'category_path' => [],
            'tags' => $publication->search_keywords ?? [],
            'list_price' => [
                'amount' => (float) $publication->public_price,
                'currency' => $publication->currency_code,
            ],
            'unit_label' => $this->localized($publication->unit_label_ar, $publication->unit_label_en),
            'availability' => $publication->availability,
            'cover_media_url' => $publication->cover_media_url,
            'gallery_media_urls' => $publication->gallery_media_urls ?? [],
            'visibility' => $publication->visibility,
            'published_at' => $publication->published_at?->toISOString(),
            'data_freshness_at' => now()->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public function offerSnapshot(MarketplaceOfferCampaign $offer): array
    {
        return [
            'kind' => 'offer',
            'offer_id' => $offer->id,
            'merchant_id' => $offer->merchant_id,
            'revision' => $offer->revision,
            'slug' => $offer->slug,
            'title' => $this->localized($offer->title_ar, $offer->title_en),
            'summary' => $this->localized($offer->summary_ar, $offer->summary_en),
            'disclosure' => $this->localized($offer->disclosure_ar, $offer->disclosure_en),
            'hero_media_url' => $offer->hero_media_url,
            'benefit' => [
                'type' => $offer->benefit_type,
                'value' => (float) $offer->benefit_value,
                'currency' => $offer->currency_code,
            ],
            'starts_at' => $offer->starts_at?->toISOString(),
            'ends_at' => $offer->ends_at?->toISOString(),
            'timezone' => $offer->timezone,
            'status' => $offer->status,
            'targets' => $offer->targets,
        ];
    }

    /** @return array<string, string> */
    private function localized(?string $ar, ?string $en): array
    {
        return array_filter(['ar' => $ar, 'en' => $en], static fn (?string $value): bool => filled($value));
    }
}
