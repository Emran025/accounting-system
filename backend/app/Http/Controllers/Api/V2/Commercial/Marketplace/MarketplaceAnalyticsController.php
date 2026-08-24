<?php

namespace App\Http\Controllers\Api\V2\Commercial\Marketplace;

use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\Commercial\Marketplace\Models\MarketplaceDailyMetric;
use App\Domains\Commercial\Marketplace\Models\MarketplaceInquiry;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOfferCampaign;
use App\Domains\Commercial\Marketplace\Models\MarketplaceOutboxEvent;
use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MarketplaceAnalyticsController extends Controller
{
    use BaseApiController;

    public function overview(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'days' => ['nullable', 'integer', Rule::in([7, 30, 90])],
            'merchant_id' => ['nullable', 'uuid', 'exists:marketplace_merchants,id'],
        ]);
        $days = (int) ($filters['days'] ?? 30);
        $from = now()->subDays($days - 1)->startOfDay();
        $merchantId = $filters['merchant_id'] ?? null;

        $metrics = MarketplaceDailyMetric::query()
            ->whereDate('metric_date', '>=', $from->toDateString())
            ->when($merchantId, fn ($query, $id) => $query->where('merchant_id', $id))
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions, COALESCE(SUM(detail_views), 0) as detail_views, COALESCE(SUM(inquiries), 0) as inquiries, COALESCE(SUM(conversion_count), 0) as conversions')
            ->first();

        $inquiryQuery = MarketplaceInquiry::query()->where('requested_at', '>=', $from)->when($merchantId, fn ($query, $id) => $query->where('merchant_id', $id));
        $funnel = (clone $inquiryQuery)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $series = MarketplaceDailyMetric::query()
            ->whereDate('metric_date', '>=', $from->toDateString())
            ->when($merchantId, fn ($query, $id) => $query->where('merchant_id', $id))
            ->selectRaw('metric_date, SUM(impressions) as impressions, SUM(detail_views) as detail_views, SUM(inquiries) as inquiries, SUM(conversion_count) as conversions')
            ->groupBy('metric_date')
            ->orderBy('metric_date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->metric_date)->toDateString(),
                'impressions' => (int) $row->impressions,
                'detail_views' => (int) $row->detail_views,
                'inquiries' => (int) $row->inquiries,
                'conversions' => (int) $row->conversions,
            ]);

        $openInquiries = (clone $inquiryQuery)->whereIn('status', ['new', 'assigned', 'qualified', 'quoted'])->count();
        $publishedProducts = MarketplaceCatalogPublication::query()->where('status', 'published')->when($merchantId, fn ($query, $id) => $query->where('merchant_id', $id))->count();
        $publishedOffers = MarketplaceOfferCampaign::query()->whereIn('status', ['published', 'scheduled'])->when($merchantId, fn ($query, $id) => $query->where('merchant_id', $id))->count();
        $failedSync = MarketplaceOutboxEvent::query()->where('status', 'failed')->count();

        $conversionRate = (int) $metrics->inquiries > 0 ? round(((int) $metrics->conversions / (int) $metrics->inquiries) * 100, 2) : 0;

        return $this->successResponse([
            'period' => ['days' => $days, 'from' => $from->toDateString(), 'to' => now()->toDateString()],
            'overview' => [
                'impressions' => (int) $metrics->impressions,
                'detail_views' => (int) $metrics->detail_views,
                'inquiries' => (int) $metrics->inquiries,
                'conversions' => (int) $metrics->conversions,
                'conversion_rate' => $conversionRate,
                'open_inquiries' => $openInquiries,
                'published_products' => $publishedProducts,
                'published_offers' => $publishedOffers,
                'failed_sync_events' => $failedSync,
            ],
            'funnel' => [
                'new' => (int) ($funnel['new'] ?? 0),
                'assigned' => (int) ($funnel['assigned'] ?? 0),
                'qualified' => (int) ($funnel['qualified'] ?? 0),
                'quoted' => (int) ($funnel['quoted'] ?? 0),
                'converted' => (int) ($funnel['converted'] ?? 0),
                'lost' => (int) ($funnel['lost'] ?? 0),
            ],
            'series' => $series,
        ]);
    }
}
