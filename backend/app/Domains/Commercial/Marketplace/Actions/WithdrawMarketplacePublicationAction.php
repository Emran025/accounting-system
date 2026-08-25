<?php

namespace App\Domains\Commercial\Marketplace\Actions;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

class WithdrawMarketplacePublicationAction
{
    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    public function withdrawProduct(MarketplaceCatalogPublication $publication, User $actor): MarketplaceCatalogPublication
    {
        return DB::transaction(function () use ($publication): MarketplaceCatalogPublication {
            $publication->forceFill([
                'status' => 'withdrawn',
                'visibility' => 'withdrawn',
                'revision' => $publication->revision + 1,
            ])->save();

            $this->outbox->queuePublicationEvent($publication->fresh(), 'catalog.product.withdrawn');

            return $publication->fresh(['merchant', 'product']);
        });
    }

    public function withdrawOffer(MarketplaceOfferCampaign $offer, User $actor): MarketplaceOfferCampaign
    {
        return DB::transaction(function () use ($offer): MarketplaceOfferCampaign {
            $offer->forceFill([
                'status' => 'withdrawn',
                'revision' => $offer->revision + 1,
            ])->save();

            $this->outbox->queueOfferEvent($offer->fresh(), 'offer.withdrawn');

            return $offer->fresh('merchant');
        });
    }
}
