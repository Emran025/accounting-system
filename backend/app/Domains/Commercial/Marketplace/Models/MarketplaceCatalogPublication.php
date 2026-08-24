<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use App\Domains\SupplyChain\Inventory\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceCatalogPublication extends Model
{
    use HasUuids;

    protected $table = 'marketplace_catalog_publications';

    protected $fillable = [
        'merchant_id',
        'product_id',
        'public_slug',
        'status',
        'visibility',
        'public_name_ar',
        'public_name_en',
        'short_description_ar',
        'short_description_en',
        'description_ar',
        'description_en',
        'search_keywords',
        'cover_media_url',
        'gallery_media_urls',
        'availability',
        'public_price',
        'currency_code',
        'unit_label_ar',
        'unit_label_en',
        'published_at',
        'published_by',
        'last_synced_at',
        'last_sync_error',
        'revision',
    ];

    protected function casts(): array
    {
        return [
            'search_keywords' => 'array',
            'gallery_media_urls' => 'array',
            'public_price' => 'decimal:2',
            'published_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'revision' => 'integer',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class, 'merchant_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function isPubliclyListed(): bool
    {
        return $this->status === 'published' && $this->visibility === 'listed';
    }
}
