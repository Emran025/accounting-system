<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceDailyMetric;
use App\Domains\Commercial\Marketplace\Models\MarketplaceInboundEvent;
use DomainException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MarketplaceInboundEventService
{
    public function __construct(
        private readonly MarketplaceInquiryService $inquiries,
    ) {}

    /** @param array<string, mixed> $envelope @return array{receipt_id:string,duplicate:bool,handled_type:?string,handled_id:?string} */
    public function ingest(string $remoteEventId, array $envelope, string $payloadSha256): array
    {
        $eventType = (string) ($envelope['event_type'] ?? '');
        $contractVersion = (string) ($envelope['contract_version'] ?? '');
        if ($contractVersion !== MarketplaceOutboxService::CONTRACT_VERSION || blank($eventType)) {
            throw new DomainException('Unsupported marketplace integration contract or event type.');
        }

        $result = DB::transaction(function () use ($remoteEventId, $envelope, $payloadSha256, $eventType, $contractVersion): array {
            $event = MarketplaceInboundEvent::query()->where('remote_event_id', $remoteEventId)->lockForUpdate()->first();
            if ($event && $event->status === 'processed') {
                return ['event' => $event, 'duplicate' => true];
            }

            if (! $event) {
                $event = MarketplaceInboundEvent::create([
                    'remote_event_id' => $remoteEventId,
                    'event_type' => $eventType,
                    'contract_version' => $contractVersion,
                    'occurred_at' => $envelope['occurred_at'] ?? now(),
                    'payload_sha256' => $payloadSha256,
                    'payload' => $envelope,
                    'status' => 'received',
                    'receipt_id' => (string) Str::uuid(),
                ]);
            }

            $event->forceFill(['status' => 'processing', 'last_error' => null])->save();

            return ['event' => $event, 'duplicate' => false];
        });

        /** @var MarketplaceInboundEvent $event */
        $event = $result['event'];
        if ($result['duplicate']) {
            return [
                'receipt_id' => $event->receipt_id,
                'duplicate' => true,
                'handled_type' => $event->handled_type,
                'handled_id' => $event->handled_id,
            ];
        }

        try {
            [$handledType, $handledId] = DB::transaction(fn (): array => $this->handle($eventType, Arr::wrap($envelope['payload'] ?? [])));
            $event->forceFill([
                'status' => 'processed',
                'handled_type' => $handledType,
                'handled_id' => $handledId,
                'processed_at' => now(),
            ])->save();
        } catch (\Throwable $exception) {
            $event->forceFill([
                'status' => 'failed',
                'last_error' => Str::limit($exception->getMessage(), 1000, ''),
            ])->save();

            throw $exception;
        }

        return [
            'receipt_id' => $event->receipt_id,
            'duplicate' => false,
            'handled_type' => $event->handled_type,
            'handled_id' => $event->handled_id,
        ];
    }

    /** @param array<string, mixed> $payload @return array{0:string,1:string|null} */
    private function handle(string $eventType, array $payload): array
    {
        return match ($eventType) {
            'marketplace.inquiry.created' => $this->handleInquiry($payload),
            'marketplace.metrics.daily' => $this->handleMetrics($payload),
            'marketplace.delivery.receipt' => $this->handleReceipt($payload),
            default => throw new DomainException('Unsupported marketplace inbound event type.'),
        };
    }

    /** @param array<string, mixed> $payload @return array{0:string,1:string} */
    private function handleInquiry(array $payload): array
    {
        $inquiry = $this->inquiries->createFromOperationalPayload($payload);

        return ['marketplace_inquiry', $inquiry->id];
    }

    /** @param array<string, mixed> $payload @return array{0:string,1:string|null} */
    private function handleMetrics(array $payload): array
    {
        $count = 0;
        foreach (Arr::wrap($payload['metrics'] ?? []) as $metric) {
            if (! is_array($metric) || blank($metric['metric_date'] ?? null)) {
                throw new DomainException('Each marketplace metric requires a metric date.');
            }

            $keyParts = [
                $metric['merchant_id'] ?? '',
                $metric['publication_id'] ?? '',
                $metric['offer_id'] ?? '',
                $metric['metric_date'],
                $metric['source'] ?? 'operational',
            ];
            MarketplaceDailyMetric::updateOrCreate(
                ['metric_key' => hash('sha256', implode('|', $keyParts))],
                [
                    'merchant_id' => $metric['merchant_id'] ?? null,
                    'publication_id' => $metric['publication_id'] ?? null,
                    'offer_id' => $metric['offer_id'] ?? null,
                    'metric_date' => $metric['metric_date'],
                    'source' => $metric['source'] ?? 'operational',
                    'impressions' => max(0, (int) ($metric['impressions'] ?? 0)),
                    'detail_views' => max(0, (int) ($metric['detail_views'] ?? 0)),
                    'inquiries' => max(0, (int) ($metric['inquiries'] ?? 0)),
                    'conversion_count' => max(0, (int) ($metric['conversion_count'] ?? 0)),
                ],
            );
            $count++;
        }

        return ['marketplace_daily_metrics', $count > 0 ? (string) $count : null];
    }

    /** @param array<string, mixed> $payload @return array{0:string,1:string|null} */
    private function handleReceipt(array $payload): array
    {
        return ['marketplace_delivery_receipt', isset($payload['event_id']) ? (string) $payload['event_id'] : null];
    }
}
