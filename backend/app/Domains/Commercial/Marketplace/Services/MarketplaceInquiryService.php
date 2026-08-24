<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceInquiry;
use App\Domains\Commercial\SalesLifecycle\Models\SalesQuotation;
use App\Domains\Commercial\SalesLifecycle\Services\SalesQuotationService;
use App\Domains\Commercial\SalesLifecycle\Services\ServiceSaleService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use DomainException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class MarketplaceInquiryService
{
    public function __construct(
        private readonly MarketplaceAuditService $audit,
        private readonly SalesQuotationService $quotations,
        private readonly ServiceSaleService $serviceSales,
    ) {}

    /** @param array<string, mixed> $payload */
    public function createFromOperationalPayload(array $payload): MarketplaceInquiry
    {
        $remoteId = (string) ($payload['inquiry_id'] ?? '');
        if (blank($remoteId)) {
            throw new DomainException('Operational marketplace inquiry identifier is required.');
        }

        return DB::transaction(function () use ($payload, $remoteId): MarketplaceInquiry {
            $existing = MarketplaceInquiry::query()->where('remote_inquiry_id', $remoteId)->first();
            if ($existing) {
                return $existing->load('items');
            }

            $customer = Arr::wrap($payload['customer'] ?? []);
            $inquiry = MarketplaceInquiry::create([
                'remote_inquiry_id' => $remoteId,
                'merchant_id' => $payload['merchant_id'] ?? null,
                'source' => 'operational',
                'channel' => $payload['channel'] ?? 'public_marketplace',
                'status' => 'new',
                'customer_name' => $customer['name'] ?? null,
                'customer_email' => $customer['email'] ?? null,
                'customer_phone' => $customer['phone'] ?? null,
                'preferred_language' => $customer['preferred_language'] ?? null,
                'message' => $payload['message'] ?? null,
                'requested_at' => $payload['requested_at'] ?? now(),
                'source_payload' => $payload,
            ]);

            $this->storeItems($inquiry, Arr::wrap($payload['items'] ?? []));
            $this->audit->record('marketplace.inquiry.received', $inquiry, null, null, $inquiry->fresh()->toArray(), ['source' => 'operational']);

            return $inquiry->fresh('items');
        });
    }

    /** @param array<string, mixed> $attributes */
    public function createManual(array $attributes, User $actor): MarketplaceInquiry
    {
        return DB::transaction(function () use ($attributes, $actor): MarketplaceInquiry {
            $inquiry = MarketplaceInquiry::create([
                ...Arr::except($attributes, ['items']),
                'source' => 'manual',
                'status' => 'new',
                'requested_at' => $attributes['requested_at'] ?? now(),
            ]);

            $this->storeItems($inquiry, Arr::wrap($attributes['items'] ?? []));
            $this->audit->record('marketplace.inquiry.created', $inquiry, $actor->id, null, $inquiry->fresh()->toArray(), ['source' => 'manual']);

            return $inquiry->fresh('items');
        });
    }

    public function assign(MarketplaceInquiry $inquiry, User $assignee, User $actor): MarketplaceInquiry
    {
        $this->assertTransition($inquiry, 'assigned');
        $before = $inquiry->only(['status', 'assigned_to', 'assigned_at']);
        $inquiry->forceFill(['status' => 'assigned', 'assigned_to' => $assignee->id, 'assigned_at' => now()])->save();
        $this->audit->record('marketplace.inquiry.assigned', $inquiry, $actor->id, $before, $inquiry->only(['status', 'assigned_to', 'assigned_at']));

        return $inquiry->fresh(['items', 'assignee']);
    }

    public function qualify(MarketplaceInquiry $inquiry, User $actor): MarketplaceInquiry
    {
        $this->assertTransition($inquiry, 'qualified');
        $before = $inquiry->only(['status', 'qualified_by', 'qualified_at']);
        $inquiry->forceFill(['status' => 'qualified', 'qualified_by' => $actor->id, 'qualified_at' => now()])->save();
        $this->audit->record('marketplace.inquiry.qualified', $inquiry, $actor->id, $before, $inquiry->only(['status', 'qualified_by', 'qualified_at']));

        return $inquiry->fresh(['items', 'assignee', 'qualifier']);
    }

    public function markLost(MarketplaceInquiry $inquiry, string $reason, User $actor): MarketplaceInquiry
    {
        $this->assertTransition($inquiry, 'lost');
        $before = $inquiry->only(['status', 'lost_reason']);
        $inquiry->forceFill(['status' => 'lost', 'lost_reason' => $reason])->save();
        $this->audit->record('marketplace.inquiry.lost', $inquiry, $actor->id, $before, $inquiry->only(['status', 'lost_reason']));

        return $inquiry->fresh('items');
    }

    public function convertToQuotation(MarketplaceInquiry $inquiry, User $actor): SalesQuotation
    {
        return DB::transaction(function () use ($inquiry, $actor): SalesQuotation {
            $inquiry->loadMissing('items.product');
            if (! in_array($inquiry->status, ['qualified', 'quoted'], true)) {
                throw new DomainException('Only qualified marketplace inquiries can be converted to quotations.');
            }

            if ($inquiry->conversion_type === 'sales_quotation' && $inquiry->conversion_id) {
                return SalesQuotation::query()->findOrFail($inquiry->conversion_id);
            }

            $items = $inquiry->items->map(function ($item): array {
                $product = $item->product;
                if (! $product || ! $product->sellable) {
                    throw new DomainException('Each inquiry item must reference an active sellable product before quotation conversion.');
                }

                return [
                    'product_id' => $product->id,
                    'sku' => $product->catalog_code,
                    'description' => $product->name,
                    'unit' => $product->sub_unit_name ?? $product->unit_name,
                    'quantity' => (float) $item->requested_quantity,
                    'unit_price' => (float) $product->unit_price,
                    'discount_amount' => 0,
                ];
            })->all();

            if (empty($items)) {
                throw new DomainException('A marketplace inquiry needs at least one valid item before quotation conversion.');
            }

            $quotation = $this->quotations->create([
                'marketplace_inquiry_id' => $inquiry->id,
                'customer_name' => $inquiry->customer_name ?: 'Marketplace visitor',
                'customer_contact' => $inquiry->customer_phone,
                'customer_email' => $inquiry->customer_email,
                'issue_date' => now()->toDateString(),
                'valid_until' => now()->addDays(7)->toDateString(),
                'currency' => $inquiry->items->first()?->currency_code ?: 'SAR',
                'tax_rate' => 0,
                'scope_summary' => $inquiry->message,
                'notes' => 'Created from Marketplace inquiry '.$inquiry->id,
                'items' => $items,
            ], $actor->id);

            $before = $inquiry->only(['status', 'conversion_type', 'conversion_id']);
            $inquiry->forceFill([
                'status' => 'quoted',
                'conversion_type' => 'sales_quotation',
                'conversion_id' => (string) $quotation->id,
            ])->save();
            $this->audit->record('marketplace.inquiry.converted_to_quotation', $inquiry, $actor->id, $before, $inquiry->only(['status', 'conversion_type', 'conversion_id']), ['quotation_id' => $quotation->id]);

            return $quotation;
        });
    }

    public function convertToServiceSale(MarketplaceInquiry $inquiry, User $actor, int $customerId, string $paymentType): int
    {
        return DB::transaction(function () use ($inquiry, $actor, $customerId, $paymentType): int {
            $inquiry->loadMissing('items.product');
            if ($inquiry->status !== 'qualified' || $inquiry->conversion_id) {
                throw new DomainException('Only an unconverted qualified inquiry can become a service sale.');
            }

            $items = $inquiry->items->map(function ($item): array {
                $service = $item->product;
                if (! $service || $item->item_kind !== 'service' || $service->item_type !== 'service' || ! $service->sellable) {
                    throw new DomainException('Service sale conversion requires active service items only.');
                }

                return [
                    'service_id' => $service->id,
                    'quantity' => (float) $item->requested_quantity,
                    'unit_price' => (float) $service->unit_price,
                    'description' => $service->name,
                ];
            })->all();

            $invoiceId = $this->serviceSales->createServiceSale([
                'payment_type' => $paymentType,
                'customer_id' => $customerId,
                'user_id' => $actor->id,
                'items' => $items,
            ]);

            $before = $inquiry->only(['status', 'conversion_type', 'conversion_id']);
            $inquiry->forceFill([
                'status' => 'converted',
                'conversion_type' => 'service_invoice',
                'conversion_id' => (string) $invoiceId,
                'converted_by' => $actor->id,
                'converted_at' => now(),
            ])->save();
            $this->audit->record('marketplace.inquiry.converted_to_service_sale', $inquiry, $actor->id, $before, $inquiry->only(['status', 'conversion_type', 'conversion_id', 'converted_at']), ['invoice_id' => $invoiceId]);

            return $invoiceId;
        });
    }

    /** @param array<int, array<string, mixed>> $items */
    private function storeItems(MarketplaceInquiry $inquiry, array $items): void
    {
        foreach ($items as $item) {
            $publicationId = $item['publication_id'] ?? null;
            $publication = $publicationId ? MarketplaceCatalogPublication::query()->with('product')->find($publicationId) : null;
            $product = $publication?->product;
            if (! $product && ! empty($item['product_id'])) {
                $product = \App\Domains\SupplyChain\Inventory\Models\Product::query()->find($item['product_id']);
            }

            $inquiry->items()->create([
                'publication_id' => $publication?->id,
                'offer_id' => $item['offer_id'] ?? null,
                'product_id' => $product?->id,
                'item_kind' => $item['item_kind'] ?? ($product?->item_type === 'service' ? 'service' : 'product'),
                'public_title' => $item['public_title'] ?? $publication?->public_name_ar ?? $product?->name,
                'requested_quantity' => max(0.001, (float) ($item['requested_quantity'] ?? 1)),
                'public_unit_price' => $item['public_unit_price'] ?? null,
                'currency_code' => $item['currency_code'] ?? null,
                'source_snapshot' => $item,
            ]);
        }
    }

    private function assertTransition(MarketplaceInquiry $inquiry, string $target): void
    {
        if (! $inquiry->canTransitionTo($target)) {
            throw new DomainException(sprintf('Marketplace inquiry cannot transition from %s to %s.', $inquiry->status, $target));
        }
    }
}
