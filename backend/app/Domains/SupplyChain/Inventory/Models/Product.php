<?php

namespace App\Domains\SupplyChain\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Builder;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use App\Domains\Finance\ForeignExchange\Models\Currency;
use App\Domains\Commercial\SalesLifecycle\Models\InvoiceItem;
use App\Domains\Commercial\Marketplace\Models\MarketplaceCatalogPublication;
use App\Domains\SupplyChain\Procurement\Models\Purchase;
use App\Support\Localization\LocalizedValue;

/**
 * Model representing an item in the unified item catalogue.
 * Supports three distinct item classes:
 *   - product      → physical goods, inventory-controlled, taxable
 *   - service      → intangible, no inventory tracking, may have special tax rules
 *   - raw_material → inventory-controlled, used in manufacturing, not sellable
 *
 * Uses composite unit structure (main unit + sub-unit) and WAC costing.
 *
 * @property int    $id
 * @property string $item_type         'product' | 'service' | 'raw_material'
 * @property bool   $taxable           Whether VAT/tax applies to this item
 * @property bool   $inventory_control Whether stock quantity is tracked
 * @property bool   $sellable          Whether this item can appear on a sales invoice
 * @property string $name
 * @property string|null $description
 * @property int|null $category_id
 * @property float $unit_price
 * @property float $minimum_profit_margin
 * @property int   $stock_quantity
 * @property string|null $unit_name
 * @property int|null    $items_per_unit
 * @property string|null $sub_unit_name
 * @property float $weighted_average_cost
 * @property int|null $created_by
 * @property int|null $purchase_currency_id
 */
class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_type',
        'taxable',
        'inventory_control',
        'sellable',
        'catalog_code',
        'name',
        'name_ar',
        'name_en',
        'description',
        'description_ar',
        'description_en',
        'category_id',
        'unit_price',
        'minimum_profit_margin',
        'stock_quantity',
        'low_stock_threshold',
        'unit_name',
        'unit_name_ar',
        'unit_name_en',
        'items_per_unit',
        'sub_unit_name',
        'sub_unit_name_ar',
        'sub_unit_name_en',
        'weighted_average_cost',
        'created_by',
        'purchase_currency_id',
    ];

    public function localized(string $attribute, ?string $locale = null): ?string
    {
        return LocalizedValue::resolve($this, $attribute, $locale);
    }

    /** @return array<string, string|null> */
    public function translationsFor(string $attribute): array
    {
        return LocalizedValue::translations($this, $attribute);
    }

    protected function casts(): array
    {
        return [
            'item_type'             => 'string',
            'taxable'               => 'boolean',
            'inventory_control'     => 'boolean',
            'sellable'              => 'boolean',
            'unit_price'            => 'decimal:2',
            'minimum_profit_margin' => 'decimal:2',
            'stock_quantity'        => 'integer',
            'low_stock_threshold'   => 'integer',
            'items_per_unit'        => 'integer',
            'weighted_average_cost' => 'decimal:2',
        ];
    }

    // ── Scopes ───────────────────────────────────────────────────────

    /** Only physical products (inventory-tracked, sellable). */
    public function scopeProducts(Builder $query): Builder
    {
        return $query->where('item_type', 'product');
    }

    /** Only services (no inventory tracking). */
    public function scopeServices(Builder $query): Builder
    {
        return $query->where('item_type', 'service');
    }

    /** Only raw materials (not sellable). */
    public function scopeRawMaterials(Builder $query): Builder
    {
        return $query->where('item_type', 'raw_material');
    }

    /** Items that can appear on a sales invoice. */
    public function scopeSellable(Builder $query): Builder
    {
        return $query->where('sellable', true);
    }

    // ── Convenience helpers ───────────────────────────────────────────

    public function isProduct(): bool     { return $this->item_type === 'product'; }
    public function isService(): bool     { return $this->item_type === 'service'; }
    public function isRawMaterial(): bool { return $this->item_type === 'raw_material'; }

    // ── Relationships ─────────────────────────────────────────────────

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function marketplacePublication(): HasOne
    {
        return $this->hasOne(MarketplaceCatalogPublication::class, 'product_id');
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function purchaseCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'purchase_currency_id');
    }

    public function serviceAvailability(): HasMany
    {
        return $this->hasMany(ServiceAvailability::class, 'service_id');
    }
}
