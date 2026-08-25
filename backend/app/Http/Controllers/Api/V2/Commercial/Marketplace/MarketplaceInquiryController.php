<?php

namespace App\Http\Controllers\Api\V2\Commercial\Marketplace;

use App\Domains\Commercial\Marketplace\Models\MarketplaceInquiry;
use App\Domains\Commercial\Marketplace\Services\MarketplaceInquiryService;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commercial\Marketplace\StoreMarketplaceInquiryRequest;
use App\Http\Resources\Commercial\Marketplace\MarketplaceInquiryResource;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketplaceInquiryController extends Controller
{
    use BaseApiController;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(MarketplaceInquiry::STATUSES)],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'merchant_id' => ['nullable', 'uuid', 'exists:marketplace_merchants,id'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = MarketplaceInquiry::query()
            ->with(['items', 'assignee'])
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['assigned_to'] ?? null, fn ($query, $userId) => $query->where('assigned_to', $userId))
            ->when($filters['merchant_id'] ?? null, fn ($query, $merchantId) => $query->where('merchant_id', $merchantId))
            ->when($filters['search'] ?? null, function ($query, $search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_email', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%")
                        ->orWhere('message', 'like', "%{$search}%")
                        ->orWhere('remote_inquiry_id', 'like', "%{$search}%");
                });
            })
            ->latest('requested_at')
            ->paginate($filters['per_page'] ?? 25);

        return $this->paginatedResponse(MarketplaceInquiryResource::collection($paginator), $paginator->total(), $paginator->currentPage(), $paginator->perPage());
    }

    public function store(StoreMarketplaceInquiryRequest $request, MarketplaceInquiryService $service): JsonResponse
    {
        $inquiry = $service->createManual($request->validated(), $request->user());

        return $this->successResponse((new MarketplaceInquiryResource($inquiry))->resolve(), 'Marketplace inquiry created.', 201);
    }

    public function show(MarketplaceInquiry $inquiry): JsonResponse
    {
        return $this->successResponse((new MarketplaceInquiryResource($inquiry->load(['items.product', 'merchant', 'assignee', 'qualifier'])))->resolve());
    }

    public function assign(Request $request, MarketplaceInquiry $inquiry, MarketplaceInquiryService $service): JsonResponse
    {
        $data = $request->validate(['assignee_id' => ['required', 'integer', 'exists:users,id']]);

        try {
            $inquiry = $service->assign($inquiry, User::query()->findOrFail($data['assignee_id']), $request->user());

            return $this->successResponse((new MarketplaceInquiryResource($inquiry))->resolve(), 'Marketplace inquiry assigned.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function qualify(MarketplaceInquiry $inquiry, Request $request, MarketplaceInquiryService $service): JsonResponse
    {
        try {
            $inquiry = $service->qualify($inquiry, $request->user());

            return $this->successResponse((new MarketplaceInquiryResource($inquiry))->resolve(), 'Marketplace inquiry qualified.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function markLost(Request $request, MarketplaceInquiry $inquiry, MarketplaceInquiryService $service): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);

        try {
            $inquiry = $service->markLost($inquiry, $data['reason'], $request->user());

            return $this->successResponse((new MarketplaceInquiryResource($inquiry))->resolve(), 'Marketplace inquiry marked as lost.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function convert(Request $request, MarketplaceInquiry $inquiry, MarketplaceInquiryService $service): JsonResponse
    {
        $data = $request->validate([
            'target' => ['required', Rule::in(['quotation', 'service_sale'])],
            'customer_id' => ['nullable', 'integer', 'exists:ar_customers,id'],
            'payment_type' => ['nullable', Rule::in(['cash', 'credit'])],
        ]);

        try {
            if ($data['target'] === 'quotation') {
                $quotation = $service->convertToQuotation($inquiry, $request->user());

                return $this->successResponse([
                    'conversion' => ['type' => 'sales_quotation', 'id' => $quotation->id, 'status' => $quotation->status],
                ], 'Marketplace inquiry converted to quotation.');
            }

            if (empty($data['customer_id']) || empty($data['payment_type'])) {
                return $this->errorResponse('Customer and payment type are required for service sale conversion.', 422);
            }

            $invoiceId = $service->convertToServiceSale($inquiry, $request->user(), (int) $data['customer_id'], $data['payment_type']);

            return $this->successResponse([
                'conversion' => ['type' => 'service_invoice', 'id' => $invoiceId],
            ], 'Marketplace inquiry converted to service sale.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }
}
