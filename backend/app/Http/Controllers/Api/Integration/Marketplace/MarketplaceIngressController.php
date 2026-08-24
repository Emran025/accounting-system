<?php

namespace App\Http\Controllers\Api\Integration\Marketplace;

use App\Domains\Commercial\Marketplace\Services\MarketplaceInboundEventService;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketplaceIngressController extends Controller
{
    public function store(Request $request, MarketplaceInboundEventService $events): JsonResponse
    {
        $payload = $request->validate([
            'contract_version' => ['required', 'string', Rule::in([MarketplaceOutboxService::CONTRACT_VERSION])],
            'event_type' => ['required', 'string', Rule::in([
                'marketplace.inquiry.created',
                'marketplace.metrics.daily',
                'marketplace.delivery.receipt',
            ])],
            'occurred_at' => ['required', 'date'],
            'producer' => ['required', 'array'],
            'producer.system' => ['required', 'string', 'max:80'],
            'producer.tenant_id' => ['required', 'string', 'max:120'],
            'payload' => ['required', 'array'],
        ]);

        if ($payload['producer']['tenant_id'] !== (string) config('marketplace.tenant_id')) {
            return response()->json(['success' => false, 'message' => 'Marketplace tenant is not recognized.'], 403);
        }

        $result = $events->ingest(
            (string) $request->attributes->get('marketplace.remote_event_id'),
            $payload,
            hash('sha256', $request->getContent()),
        );

        return response()->json([
            'success' => true,
            'receipt_id' => $result['receipt_id'],
            'duplicate' => $result['duplicate'],
            'handled_type' => $result['handled_type'],
            'handled_id' => $result['handled_id'],
        ], $result['duplicate'] ? 200 : 202);
    }
}
