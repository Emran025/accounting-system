<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use Illuminate\Support\Facades\DB;

class MarketplaceOfferLifecycleService
{
    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    /** @return array{activated:int,expired:int} */
    public function refresh(): array
    {
        $activated = MarketplaceOfferCampaign::query()
            ->where('status', 'scheduled')
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->pluck('id');
        $expired = MarketplaceOfferCampaign::query()
            ->whereIn('status', ['scheduled', 'published'])
            ->where('ends_at', '<=', now())
            ->pluck('id');

        foreach ($activated as $id) {
            DB::transaction(function () use ($id): void {
                $offer = MarketplaceOfferCampaign::query()->lockForUpdate()->find($id);
                if (! $offer || $offer->status !== 'scheduled' || $offer->starts_at?->isFuture() || $offer->ends_at?->isPast()) {
                    return;
                }
                $offer->forceFill([
                    'status' => 'published',
                    'published_at' => now(),
                    'revision' => $offer->revision + 1,
                    'last_sync_error' => null,
                ])->save();
                $this->outbox->queueOfferEvent($offer->fresh(), 'offer.published');
            });
        }

        foreach ($expired as $id) {
            DB::transaction(function () use ($id): void {
                $offer = MarketplaceOfferCampaign::query()->lockForUpdate()->find($id);
                if (! $offer || ! in_array($offer->status, ['scheduled', 'published'], true) || $offer->ends_at?->isFuture()) {
                    return;
                }
                $offer->forceFill([
                    'status' => 'expired',
                    'revision' => $offer->revision + 1,
                ])->save();
                $this->outbox->queueOfferEvent($offer->fresh(), 'offer.expired');
            });
        }

        return ['activated' => $activated->count(), 'expired' => $expired->count()];
    }
}
