<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceMerchant extends Model
{
    use HasUuids;

    protected $table = 'marketplace_merchants';

    protected $fillable = [
        'slug',
        'display_name_ar',
        'display_name_en',
        'short_description_ar',
        'short_description_en',
        'logo_media_url',
        'public_url',
        'status',
        'verified_at',
        'verified_by',
        'revision',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'revision' => 'integer',
        ];
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function publications(): HasMany
    {
        return $this->hasMany(MarketplaceCatalogPublication::class, 'merchant_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(MarketplaceOfferCampaign::class, 'merchant_id');
    }

    public function isVerified(): bool
    {
        return $this->status === 'verified';
    }
}
