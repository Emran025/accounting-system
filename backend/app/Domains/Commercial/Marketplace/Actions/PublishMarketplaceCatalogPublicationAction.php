<?php

namespace App\Domains\Commercial\Marketplace\Actions;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

class PublishMarketplaceCatalogPublicationAction
{
    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    public function execute(MarketplaceCatalogPublication $publication, User $actor): MarketplaceCatalogPublication
    {
        if (! $publication->relationLoaded('merchant')) {
            $publication->load('merchant');
        }
        if (! $publication->relationLoaded('product')) {
            $publication->load('product');
        }

        if (! $publication->merchant?->isVerified()) {
            throw new DomainException('لا يمكن نشر منتج عام قبل التحقق من ملف التاجر.');
        }

        if (! $publication->product?->sellable) {
            throw new DomainException('لا يمكن نشر منتج غير قابل للبيع في الكتالوج العام.');
        }

        if (blank($publication->cover_media_url)) {
            throw new DomainException('صورة الغلاف مطلوبة قبل النشر العام.');
        }

        if ($publication->public_price === null || blank($publication->currency_code)) {
            throw new DomainException('السعر العام والعملة مطلوبان قبل النشر.');
        }

        return DB::transaction(function () use ($publication, $actor): MarketplaceCatalogPublication {
            $publication->forceFill([
                'status' => 'published',
                'visibility' => 'listed',
                'published_at' => now(),
                'published_by' => $actor->id,
                'last_sync_error' => null,
                'revision' => $publication->revision + 1,
            ])->save();

            $this->outbox->queuePublicationEvent($publication->fresh(), 'catalog.product.published');

            return $publication->fresh(['merchant', 'product']);
        });
    }
}
