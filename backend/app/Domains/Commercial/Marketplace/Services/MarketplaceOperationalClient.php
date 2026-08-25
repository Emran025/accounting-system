<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOutboxEvent;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class MarketplaceOperationalClient
{
    private const EVENTS_PATH = '/api/integration/marketplace/v1/events';

    public function dispatchPending(int $limit = 50): array
    {
        $processed = 0;
        $delivered = 0;
        $failed = 0;

        MarketplaceOutboxEvent::query()
            ->whereIn('status', ['pending', 'failed'])
            ->where('available_at', '<=', now())
            ->orderBy('available_at')
            ->limit($limit)
            ->pluck('id')
            ->each(function (string $eventId) use (&$processed, &$delivered, &$failed): void {
                $event = $this->claim($eventId);
                if (! $event) {
                    return;
                }

                $processed++;

                try {
                    $this->deliver($event);
                    $delivered++;
                } catch (Throwable $exception) {
                    $this->markFailed($event, $exception);
                    $failed++;
                }
            });

        return compact('processed', 'delivered', 'failed');
    }

    public function deliver(MarketplaceOutboxEvent $event): void
    {
        $configuration = $this->configuration();
        $body = json_encode($event->payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $timestamp = now()->toISOString();
        $requestId = (string) Str::uuid();
        $signature = $this->signature($body, $timestamp, $event->id, $configuration['signing_key']);

        $response = $this->request($configuration['timeout_seconds'])
            ->withHeaders([
                'X-Contract-Version' => MarketplaceOutboxService::CONTRACT_VERSION,
                'X-Request-ID' => $requestId,
                'Idempotency-Key' => $event->idempotency_key,
                'X-Accore-Event-ID' => $event->id,
                'X-Accore-Timestamp' => $timestamp,
                'X-Accore-Key-ID' => $configuration['signing_key_id'],
                'X-Accore-Signature' => "sha256={$signature}",
            ])
            ->withBody($body, 'application/json')
            ->post($configuration['base_url'].self::EVENTS_PATH);

        if (! $response->successful()) {
            throw new RuntimeException(sprintf('Operational marketplace endpoint returned HTTP %d.', $response->status()));
        }

        $receiptId = (string) ($response->json('receipt_id') ?? $response->header('X-Receipt-ID') ?? '');
        $event->forceFill([
            'status' => 'delivered',
            'delivered_at' => now(),
            'remote_receipt_id' => $receiptId,
            'last_error' => null,
        ])->save();

        $this->markAggregateSynchronized($event);
    }

    private function claim(string $eventId): ?MarketplaceOutboxEvent
    {
        return DB::transaction(function () use ($eventId): ?MarketplaceOutboxEvent {
            $event = MarketplaceOutboxEvent::query()->lockForUpdate()->find($eventId);
            if (! $event || ! in_array($event->status, ['pending', 'failed'], true) || $event->available_at->isFuture()) {
                return null;
            }

            $event->forceFill([
                'status' => 'processing',
                'attempts' => $event->attempts + 1,
            ])->save();

            return $event->fresh();
        });
    }

    private function markFailed(MarketplaceOutboxEvent $event, Throwable $exception): void
    {
        $backoff = max(1, (int) config('marketplace.retry_backoff_seconds', 60));
        $error = Str::limit($exception->getMessage(), 1000, '');
        $event->forceFill([
            'status' => 'failed',
            'available_at' => now()->addSeconds($backoff),
            'last_error' => $error,
        ])->save();

        $this->markAggregateFailed($event, $error);
    }

    private function markAggregateSynchronized(MarketplaceOutboxEvent $event): void
    {
        $attributes = ['last_synced_at' => now(), 'last_sync_error' => null];
        match ($event->aggregate_type) {
            'catalog_publication' => MarketplaceCatalogPublication::query()->whereKey($event->aggregate_id)->update($attributes),
            'offer_campaign' => MarketplaceOfferCampaign::query()->whereKey($event->aggregate_id)->update($attributes),
            default => null,
        };
    }

    private function markAggregateFailed(MarketplaceOutboxEvent $event, string $error): void
    {
        match ($event->aggregate_type) {
            'catalog_publication' => MarketplaceCatalogPublication::query()->whereKey($event->aggregate_id)->update(['last_sync_error' => $error]),
            'offer_campaign' => MarketplaceOfferCampaign::query()->whereKey($event->aggregate_id)->update(['last_sync_error' => $error]),
            default => null,
        };
    }

    /** @return array{base_url:string,signing_key:string,signing_key_id:string,timeout_seconds:int} */
    private function configuration(): array
    {
        $baseUrl = (string) config('marketplace.operational_base_url');
        $signingKey = (string) config('marketplace.signing_key');

        if (! config('marketplace.enabled') || blank($baseUrl) || blank($signingKey) || blank(config('marketplace.tenant_id'))) {
            throw new RuntimeException('Marketplace delivery is not configured for this tenant.');
        }

        return [
            'base_url' => rtrim($baseUrl, '/'),
            'signing_key' => $signingKey,
            'signing_key_id' => (string) config('marketplace.signing_key_id', 'default'),
            'timeout_seconds' => max(1, (int) config('marketplace.timeout_seconds', 10)),
        ];
    }

    private function request(int $timeout): PendingRequest
    {
        return Http::acceptJson()->timeout($timeout)->connectTimeout($timeout)->retry(1, 0, throw: false);
    }

    private function signature(string $body, string $timestamp, string $eventId, string $key): string
    {
        $canonical = implode("\n", ['POST', self::EVENTS_PATH, $timestamp, $eventId, hash('sha256', $body)]);

        return hash_hmac('sha256', $canonical, $key);
    }
}
