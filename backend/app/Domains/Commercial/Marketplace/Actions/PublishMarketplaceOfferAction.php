<?php

namespace App\Domains\Commercial\Marketplace\Actions;

use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

class PublishMarketplaceOfferAction
{
    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    public function execute(MarketplaceOfferCampaign $offer, User $actor): MarketplaceOfferCampaign
    {
        if (! $offer->relationLoaded('merchant')) {
            $offer->load('merchant');
        }

        if (! $offer->merchant?->isVerified()) {
            throw new DomainException('لا يمكن نشر عرض قبل التحقق من ملف التاجر.');
        }

        if (empty($offer->targets)) {
            throw new DomainException('يجب ربط العرض بمنتج أو فئة أو مجموعة واحدة على الأقل.');
        }

        if (! $offer->starts_at || ! $offer->ends_at || $offer->ends_at->lte($offer->starts_at)) {
            throw new DomainException('يجب أن تكون نهاية العرض بعد وقت بدايته.');
        }

        if ($offer->benefit_type !== 'bundle' && $offer->benefit_type !== 'gift' && $offer->benefit_value <= 0) {
            throw new DomainException('قيمة منفعة العرض يجب أن تكون أكبر من صفر.');
        }

        return DB::transaction(function () use ($offer, $actor): MarketplaceOfferCampaign {
            $isScheduled = $offer->starts_at->isFuture();
            $offer->forceFill([
                'status' => $isScheduled ? 'scheduled' : 'published',
                'published_at' => $isScheduled ? null : now(),
                'published_by' => $actor->id,
                'last_sync_error' => null,
                'revision' => $offer->revision + 1,
            ])->save();

            $this->outbox->queueOfferEvent($offer->fresh(), $isScheduled ? 'offer.scheduled' : 'offer.published');

            return $offer->fresh('merchant');
        });
    }
}
