<?php

namespace App\Console\Commands;

use App\Domains\Commercial\Marketplace\Services\MarketplaceOfferLifecycleService;
use Illuminate\Console\Command;

class RefreshMarketplaceOffersCommand extends Command
{
    protected $signature = 'marketplace:refresh-offers';

    protected $description = 'Activate scheduled Marketplace offers and expire ended offers.';

    public function handle(MarketplaceOfferLifecycleService $offers): int
    {
        if (! config('marketplace.enabled')) {
            $this->line('Marketplace synchronization is disabled for this environment.');

            return self::SUCCESS;
        }

        $result = $offers->refresh();
        $this->table(['Activated', 'Expired'], [[$result['activated'], $result['expired']]]);

        return self::SUCCESS;
    }
}
