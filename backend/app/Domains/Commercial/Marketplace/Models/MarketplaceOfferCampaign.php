<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class MarketplaceOfferCampaign extends Model
{
    use HasUuids;

    protected $table = 'marketplace_offer_campaigns';

    protected $fillable = [
        'merchant_id',
        'slug',
        'title_ar',
        'title_en',
        'summary_ar',
        'summary_en',
        'disclosure_ar',
        'disclosure_en',
        'benefit_type',
        'benefit_value',
        'currency_code',
        'hero_media_url',
        'targets',
        'starts_at',
        'ends_at',
        'timezone',
        'status',
        'published_at',
        'published_by',
        'last_synced_at',
        'last_sync_error',
        'revision',
    ];

    protected function casts(): array
    {
        return [
            'benefit_value' => 'decimal:2',
            'targets' => 'array',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'published_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'revision' => 'integer',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class, 'merchant_id');
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function media(): MorphToMany
    {
        return $this->morphToMany(MarketplaceMediaAsset::class, 'assignable', 'marketplace_media_assignments')
            ->withPivot(['id', 'role', 'sort_order'])->withTimestamps()->orderByPivot('sort_order');
    }

    public function isActiveAt(?\DateTimeInterface $at = null): bool
    {
        $at ??= now();

        return $this->status === 'published'
            && $this->starts_at?->lte($at)
            && $this->ends_at?->gt($at);
    }
}
