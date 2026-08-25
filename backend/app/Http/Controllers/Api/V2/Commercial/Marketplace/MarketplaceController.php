<?php

namespace App\Http\Controllers\Api\V2\Commercial\Marketplace;

use App\Domains\Commercial\Marketplace\Actions\PublishMarketplaceCatalogPublicationAction;
use App\Domains\Commercial\Marketplace\Actions\PublishMarketplaceOfferAction;
use App\Domains\Commercial\Marketplace\Actions\VerifyMarketplaceMerchantAction;
use App\Domains\Commercial\Marketplace\Actions\WithdrawMarketplacePublicationAction;
use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceMerchant;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOutboxEvent;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOperationalClient;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commercial\Marketplace\StoreMarketplaceMerchantRequest;
use App\Http\Requests\Commercial\Marketplace\StoreMarketplaceOfferRequest;
use App\Http\Requests\Commercial\Marketplace\StoreMarketplacePublicationRequest;
use App\Http\Requests\Commercial\Marketplace\UpdateMarketplaceMerchantRequest;
use App\Http\Requests\Commercial\Marketplace\UpdateMarketplaceOfferRequest;
use App\Http\Requests\Commercial\Marketplace\UpdateMarketplacePublicationRequest;
use App\Http\Resources\Commercial\Marketplace\MarketplaceCatalogPublicationResource;
use App\Http\Resources\Commercial\Marketplace\MarketplaceMerchantResource;
use App\Http\Resources\Commercial\Marketplace\MarketplaceOfferCampaignResource;
use App\Http\Resources\Commercial\Marketplace\MarketplaceOutboxEventResource;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    use BaseApiController;

    public function merchants(Request $request): JsonResponse
    {
        $paginator = MarketplaceMerchant::query()->latest()->paginate($this->perPage($request));

        return $this->paginatedResponse(MarketplaceMerchantResource::collection($paginator), $paginator->total(), $paginator->currentPage(), $paginator->perPage());
    }

    public function storeMerchant(StoreMarketplaceMerchantRequest $request): JsonResponse
    {
        $merchant = MarketplaceMerchant::create($request->validated());

        return $this->successResponse((new MarketplaceMerchantResource($merchant))->resolve(), 'Marketplace merchant created.', 201);
    }

    public function showMerchant(MarketplaceMerchant $merchant): JsonResponse
    {
        return $this->successResponse((new MarketplaceMerchantResource($merchant))->resolve());
    }

    public function updateMerchant(UpdateMarketplaceMerchantRequest $request, MarketplaceMerchant $merchant, MarketplaceOutboxService $outbox): JsonResponse
    {
        $merchant->fill($request->validated());
        $merchant->revision++;
        $merchant->save();

        if ($merchant->isVerified()) {
            $outbox->queueMerchantEvent($merchant->fresh(), 'merchant.updated');
        }

        return $this->successResponse((new MarketplaceMerchantResource($merchant->fresh()))->resolve(), 'Marketplace merchant updated.');
    }

    public function verifyMerchant(MarketplaceMerchant $merchant, VerifyMarketplaceMerchantAction $action): JsonResponse
    {
        try {
            $merchant = $action->execute($merchant, request()->user());

            return $this->successResponse((new MarketplaceMerchantResource($merchant))->resolve(), 'Marketplace merchant verified.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function publications(Request $request): JsonResponse
    {
        $paginator = MarketplaceCatalogPublication::query()
            ->with('merchant:id,slug,display_name_ar,display_name_en')
            ->when($request->filled('merchant_id'), fn ($query) => $query->where('merchant_id', $request->string('merchant_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($this->perPage($request));

        return $this->paginatedResponse(MarketplaceCatalogPublicationResource::collection($paginator), $paginator->total(), $paginator->currentPage(), $paginator->perPage());
    }

    public function storePublication(StoreMarketplacePublicationRequest $request): JsonResponse
    {
        $publication = MarketplaceCatalogPublication::create($request->validated());

        return $this->successResponse((new MarketplaceCatalogPublicationResource($publication))->resolve(), 'Marketplace publication created.', 201);
    }

    public function showPublication(MarketplaceCatalogPublication $publication): JsonResponse
    {
        return $this->successResponse((new MarketplaceCatalogPublicationResource($publication))->resolve());
    }

    public function updatePublication(UpdateMarketplacePublicationRequest $request, MarketplaceCatalogPublication $publication, MarketplaceOutboxService $outbox): JsonResponse
    {
        $publication->fill($request->validated());
        $publication->revision++;
        $publication->save();

        if ($publication->isPubliclyListed()) {
            $outbox->queuePublicationEvent($publication->fresh(), 'catalog.product.updated');
        }

        return $this->successResponse((new MarketplaceCatalogPublicationResource($publication->fresh()))->resolve(), 'Marketplace publication updated.');
    }

    public function publishPublication(MarketplaceCatalogPublication $publication, PublishMarketplaceCatalogPublicationAction $action): JsonResponse
    {
        try {
            $publication = $action->execute($publication, request()->user());

            return $this->successResponse((new MarketplaceCatalogPublicationResource($publication))->resolve(), 'Marketplace publication published.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function withdrawPublication(MarketplaceCatalogPublication $publication, WithdrawMarketplacePublicationAction $action): JsonResponse
    {
        $publication = $action->withdrawProduct($publication, request()->user());

        return $this->successResponse((new MarketplaceCatalogPublicationResource($publication))->resolve(), 'Marketplace publication withdrawn.');
    }

    public function offers(Request $request): JsonResponse
    {
        $paginator = MarketplaceOfferCampaign::query()
            ->when($request->filled('merchant_id'), fn ($query) => $query->where('merchant_id', $request->string('merchant_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($this->perPage($request));

        return $this->paginatedResponse(MarketplaceOfferCampaignResource::collection($paginator), $paginator->total(), $paginator->currentPage(), $paginator->perPage());
    }

    public function storeOffer(StoreMarketplaceOfferRequest $request): JsonResponse
    {
        $offer = MarketplaceOfferCampaign::create($request->validated());

        return $this->successResponse((new MarketplaceOfferCampaignResource($offer))->resolve(), 'Marketplace offer created.', 201);
    }

    public function showOffer(MarketplaceOfferCampaign $offer): JsonResponse
    {
        return $this->successResponse((new MarketplaceOfferCampaignResource($offer))->resolve());
    }

    public function updateOffer(UpdateMarketplaceOfferRequest $request, MarketplaceOfferCampaign $offer, MarketplaceOutboxService $outbox): JsonResponse
    {
        $offer->fill($request->validated());
        $offer->revision++;
        $offer->save();

        if (in_array($offer->status, ['scheduled', 'published'], true)) {
            $outbox->queueOfferEvent($offer->fresh(), $offer->status === 'scheduled' ? 'offer.scheduled' : 'offer.updated');
        }

        return $this->successResponse((new MarketplaceOfferCampaignResource($offer->fresh()))->resolve(), 'Marketplace offer updated.');
    }

    public function publishOffer(MarketplaceOfferCampaign $offer, PublishMarketplaceOfferAction $action): JsonResponse
    {
        try {
            $offer = $action->execute($offer, request()->user());

            return $this->successResponse((new MarketplaceOfferCampaignResource($offer))->resolve(), 'Marketplace offer published.');
        } catch (DomainException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }
    }

    public function withdrawOffer(MarketplaceOfferCampaign $offer, WithdrawMarketplacePublicationAction $action): JsonResponse
    {
        $offer = $action->withdrawOffer($offer, request()->user());

        return $this->successResponse((new MarketplaceOfferCampaignResource($offer))->resolve(), 'Marketplace offer withdrawn.');
    }

    public function outbox(Request $request): JsonResponse
    {
        $paginator = MarketplaceOutboxEvent::query()
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($this->perPage($request));

        return $this->paginatedResponse(MarketplaceOutboxEventResource::collection($paginator), $paginator->total(), $paginator->currentPage(), $paginator->perPage());
    }

    public function dispatchOutbox(Request $request, MarketplaceOperationalClient $client): JsonResponse
    {
        $limit = max(1, min(100, (int) $request->input('limit', 25)));
        $result = $client->dispatchPending($limit);

        return $this->successResponse($result, 'Marketplace outbox dispatch completed.');
    }

    private function perPage(Request $request): int
    {
        return max(1, min(100, (int) $request->input('per_page', 25)));
    }
}
