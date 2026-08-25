<?php

namespace App\Http\Controllers\Api\V2\Commercial\Marketplace;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceMediaAsset;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Services\MarketplaceOutboxService;
use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commercial\Marketplace\MarketplaceMediaAssetResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceMediaController extends Controller
{
    use BaseApiController;

    public function __construct(private readonly MarketplaceOutboxService $outbox) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'merchant_id' => ['nullable', 'uuid', 'exists:marketplace_merchants,id'],
            'status' => ['nullable', 'in:ready,rejected,archived'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $assets = MarketplaceMediaAsset::query()
            ->when($filters['merchant_id'] ?? null, fn ($query, $merchantId) => $query->where('merchant_id', $merchantId))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where('original_name', 'like', "%{$search}%"))
            ->latest()->paginate($filters['per_page'] ?? 36);

        return $this->paginatedResponse(MarketplaceMediaAssetResource::collection($assets), $assets->total(), $assets->currentPage(), $assets->perPage());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'merchant_id' => ['nullable', 'uuid', 'exists:marketplace_merchants,id'],
            'file' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm', 'max:51200'],
            'alt_text_ar' => ['nullable', 'string', 'max:500'],
            'alt_text_en' => ['nullable', 'string', 'max:500'],
        ]);

        $file = $data['file'];
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
        $dimensions = str_starts_with($mimeType, 'image/') ? @getimagesize($file->getRealPath()) : false;
        $merchantSegment = $data['merchant_id'] ?? 'shared';
        $path = $file->storePublicly("marketplace/{$merchantSegment}/".now()->format('Y/m'), 'public');

        $asset = MarketplaceMediaAsset::create([
            'merchant_id' => $data['merchant_id'] ?? null,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mimeType,
            'size_bytes' => $file->getSize(),
            'width' => is_array($dimensions) ? $dimensions[0] : null,
            'height' => is_array($dimensions) ? $dimensions[1] : null,
            'alt_text_ar' => $data['alt_text_ar'] ?? null,
            'alt_text_en' => $data['alt_text_en'] ?? null,
            'status' => 'ready',
            'created_by' => $request->user()?->id,
        ]);

        return $this->successResponse(new MarketplaceMediaAssetResource($asset), 'Marketplace media uploaded.', 201);
    }

    public function update(Request $request, MarketplaceMediaAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'alt_text_ar' => ['nullable', 'string', 'max:500'],
            'alt_text_en' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:ready,rejected,archived'],
        ]);

        $asset->update($data);

        return $this->successResponse(new MarketplaceMediaAssetResource($asset->fresh()), 'Marketplace media updated.');
    }

    public function assign(Request $request, MarketplaceMediaAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'target_type' => ['required', 'in:publication,offer'],
            'target_id' => ['required', 'uuid'],
            'role' => ['required', 'in:cover,gallery,thumbnail,campaign'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $target = $data['target_type'] === 'publication'
            ? MarketplaceCatalogPublication::query()->findOrFail($data['target_id'])
            : MarketplaceOfferCampaign::query()->findOrFail($data['target_id']);
        if ($asset->merchant_id && $asset->merchant_id !== $target->merchant_id) {
            return $this->errorResponse('Media asset and target must belong to the same merchant.', 422);
        }

        DB::transaction(function () use ($asset, $target, $data): void {
            if ($data['role'] === 'cover') {
                $target->media()->wherePivot('role', 'cover')->detach();
            }
            $target->media()->syncWithoutDetaching([
                $asset->id => ['role' => $data['role'], 'sort_order' => $data['sort_order'] ?? 0],
            ]);

            if ($target instanceof MarketplaceCatalogPublication) {
                $changes = ['revision' => $target->revision + 1];
                if ($data['role'] === 'cover') {
                    $changes['cover_media_url'] = $asset->public_url;
                }
                if ($data['role'] === 'gallery') {
                    $gallery = collect($target->gallery_media_urls ?? [])->reject(fn (string $url) => $url === $asset->public_url)->push($asset->public_url)->values()->all();
                    $changes['gallery_media_urls'] = $gallery;
                }
                $target->forceFill($changes)->save();
                if ($target->status === 'published') {
                    $this->outbox->queuePublicationEvent($target->fresh(), 'publication.updated');
                }
            }

            if ($target instanceof MarketplaceOfferCampaign) {
                $changes = ['revision' => $target->revision + 1];
                if ($data['role'] === 'campaign') {
                    $changes['hero_media_url'] = $asset->public_url;
                }
                $target->forceFill($changes)->save();
                if (in_array($target->status, ['published', 'scheduled'], true)) {
                    $this->outbox->queueOfferEvent($target->fresh(), 'offer.updated');
                }
            }
        });

        return $this->successResponse(new MarketplaceMediaAssetResource($asset->fresh()), 'Marketplace media assigned.');
    }
}
