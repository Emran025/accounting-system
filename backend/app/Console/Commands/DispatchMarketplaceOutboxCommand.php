<?php

namespace App\Console\Commands;

use App\Domains\Commercial\Marketplace\Services\MarketplaceOperationalClient;
use Illuminate\Console\Command;

class DispatchMarketplaceOutboxCommand extends Command
{
    protected $signature = 'marketplace:dispatch-outbox {--limit=50 : Maximum number of events to attempt}';

    protected $description = 'Deliver pending Marketplace outbox events to the operational catalog service.';

    public function handle(MarketplaceOperationalClient $client): int
    {
        if (! config('marketplace.enabled')) {
            $this->line('Marketplace synchronization is disabled for this environment.');

            return self::SUCCESS;
        }

        $limit = max(1, min(500, (int) $this->option('limit')));
        $result = $client->dispatchPending($limit);

        $this->table(['Processed', 'Delivered', 'Failed'], [[
            $result['processed'],
            $result['delivered'],
            $result['failed'],
        ]]);

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
