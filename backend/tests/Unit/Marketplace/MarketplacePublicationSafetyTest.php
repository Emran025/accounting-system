<?php

namespace Tests\Unit\Marketplace;

use App\Domains\Commercial\Marketplace\Actions\PublishMarketplaceCatalogPublicationAction;
use App\Domains\Commercial\Marketplace\Actions\PublishMarketplaceOfferAction;
use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceMerchant;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use App\Domains\SupplyChain\Inventory\Models\Product;
use DomainException;
use Illuminate\Support\Str;
use PHPUnit\Framework\TestCase;

class MarketplacePublicationSafetyTest extends TestCase
{
    public function test_publication_snapshot_omits_internal_product_cost_and_stock_fields(): void
    {
        $merchant = new MarketplaceMerchant();
        $merchant->forceFill(['id' => (string) Str::uuid(), 'status' => 'verified', 'revision' => 1]);

        $product = new Product();
        $product->forceFill([
            'id' => 123,
            'catalog_code' => 'SKU-123',
            'name_ar' => 'منتج آمن',
            'name_en' => 'Safe product',
            'description_ar' => 'وصف عام',
            'description_en' => 'Public description',
            'cost_price' => 9.5,
            'purchase_price' => 10.0,
            'weighted_average_cost' => 9.75,
            'minimum_profit_margin' => 30,
            'stock_quantity' => 500,
        ]);

        $publication = new MarketplaceCatalogPublication();
        $publication->forceFill([
            'id' => (string) Str::uuid(),
            'merchant_id' => $merchant->id,
            'product_id' => $product->id,
            'public_slug' => 'safe-product',
            'public_name_ar' => 'منتج عام آمن',
            'public_price' => 20,
            'currency_code' => 'SAR',
            'availability' => 'available',
            'cover_media_url' => 'https://cdn.example.test/product.jpg',
            'gallery_media_urls' => [],
            'visibility' => 'listed',
            'revision' => 3,
        ]);
        $publication->setRelation('merchant', $merchant);
        $publication->setRelation('product', $product);

        $snapshot = (new MarketplaceOutboxService())->publicationSnapshot($publication);
        $serialized = json_encode($snapshot, JSON_THROW_ON_ERROR);

        $this->assertSame('SKU-123', $snapshot['catalog_code']);
        $this->assertSame(20.0, $snapshot['list_price']['amount']);
        $this->assertStringNotContainsString('cost_price', $serialized);
        $this->assertStringNotContainsString('purchase_price', $serialized);
        $this->assertStringNotContainsString('weighted_average_cost', $serialized);
        $this->assertStringNotContainsString('minimum_profit_margin', $serialized);
        $this->assertStringNotContainsString('stock_quantity', $serialized);
    }

    public function test_product_publication_cannot_be_published_before_merchant_verification(): void
    {
        $merchant = new MarketplaceMerchant();
        $merchant->forceFill(['id' => (string) Str::uuid(), 'status' => 'draft', 'revision' => 1]);
        $product = new Product();
        $product->forceFill(['id' => 55, 'sellable' => true]);
        $publication = new MarketplaceCatalogPublication();
        $publication->forceFill([
            'id' => (string) Str::uuid(),
            'merchant_id' => $merchant->id,
            'product_id' => $product->id,
            'cover_media_url' => 'https://cdn.example.test/product.jpg',
            'public_price' => 100,
            'currency_code' => 'SAR',
            'revision' => 1,
        ]);
        $publication->setRelation('merchant', $merchant);
        $publication->setRelation('product', $product);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('التحقق من ملف التاجر');

        (new PublishMarketplaceCatalogPublicationAction(new MarketplaceOutboxService()))->execute($publication, new User(['id' => 1]));
    }

    public function test_offer_cannot_be_published_without_targets(): void
    {
        $merchant = new MarketplaceMerchant();
        $merchant->forceFill(['id' => (string) Str::uuid(), 'status' => 'verified', 'revision' => 1]);
        $offer = new MarketplaceOfferCampaign();
        $offer->setRawAttributes([
            'id' => (string) Str::uuid(),
            'merchant_id' => $merchant->id,
            'title_ar' => 'عرض بلا هدف',
            'benefit_type' => 'percentage',
            'benefit_value' => 10,
            'targets' => '[]',
            'starts_at' => now()->toDateTimeString(),
            'ends_at' => now()->addDay()->toDateTimeString(),
            'revision' => 1,
        ]);
        $offer->setRelation('merchant', $merchant);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('ربط العرض');

        (new PublishMarketplaceOfferAction(new MarketplaceOutboxService()))->execute($offer, new User(['id' => 1]));
    }
}
