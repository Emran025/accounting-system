<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\SupplyChain\Inventory\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceInquiryItem extends Model
{
    use HasUuids;

    protected $table = 'marketplace_inquiry_items';

    protected $fillable = [
        'inquiry_id',
        'publication_id',
        'offer_id',
        'product_id',
        'item_kind',
        'public_title',
        'requested_quantity',
        'public_unit_price',
        'currency_code',
        'source_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'requested_quantity' => 'decimal:3',
            'public_unit_price' => 'decimal:2',
            'source_snapshot' => 'array',
        ];
    }

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(MarketplaceInquiry::class, 'inquiry_id');
    }

    public function publication(): BelongsTo
    {
        return $this->belongsTo(MarketplaceCatalogPublication::class, 'publication_id');
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(MarketplaceOfferCampaign::class, 'offer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
