<?php

namespace App\Domains\Commercial\Marketplace\Actions;

use App\Domains\Commercial\Marketplace\Models\MarketplaceMerchant;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOutboxEvent;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

class VerifyMarketplaceMerchantAction
{
    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    public function execute(MarketplaceMerchant $merchant, User $actor): MarketplaceMerchant
    {
        return DB::transaction(function () use ($merchant, $actor): MarketplaceMerchant {
            $merchant->forceFill([
                'status' => 'verified',
                'verified_at' => now(),
                'verified_by' => $actor->id,
                'revision' => $merchant->revision + 1,
            ])->save();

            $this->outbox->queueMerchantEvent($merchant->fresh(), 'merchant.verified');

            return $merchant->fresh();
        });
    }
}
