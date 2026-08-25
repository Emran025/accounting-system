<?php

namespace App\Domains\Commercial\Marketplace\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceDailyMetric extends Model
{
    use HasUuids;

    protected $table = 'marketplace_daily_metrics';

    protected $fillable = [
        'metric_key',
        'merchant_id',
        'publication_id',
        'offer_id',
        'metric_date',
        'source',
        'impressions',
        'detail_views',
        'inquiries',
        'conversion_count',
    ];

    protected function casts(): array
    {
        return ['metric_date' => 'date'];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class, 'merchant_id');
    }

    public function publication(): BelongsTo
    {
        return $this->belongsTo(MarketplaceCatalogPublication::class, 'publication_id');
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(MarketplaceOfferCampaign::class, 'offer_id');
    }
}
