<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model representing an inventory product.
 * Supports composite unit structure (main unit + sub-unit) and WAC costing.
 * 
 * @property int $id
 * @property string $name Product display name
 * @property string|null $description Product description
 * @property int|null $category_id Category FK
 * @property float $unit_price Default selling price
 * @property float $minimum_profit_margin Floor pricing enforcement
 * @property int $stock_quantity Current inventory quantity (in sub-units)
 * @property string|null $unit_name Main unit name (e.g., 'carton')
 * @property int|null $items_per_unit Sub-units per main unit
 * @property string|null $sub_unit_name Sub-unit name (e.g., 'piece')
 * @property float $weighted_average_cost WAC for COGS calculation
 * @property int|null $created_by User who created the product
 * @property int|null $purchase_currency_id Default currency for purchases
 */
class Product extends Model
{
    use HasFactory;
    protected $fillable = [
        'name',
        'description',
        'category_id',
        'unit_price',
        'minimum_profit_margin',
        'stock_quantity',
        'unit_name',
        'items_per_unit',
        'sub_unit_name',
        'weighted_average_cost',
        'created_by',
        'purchase_currency_id',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'minimum_profit_margin' => 'decimal:2',
            'stock_quantity' => 'integer',
            'items_per_unit' => 'integer',
            'weighted_average_cost' => 'decimal:2',
        ];
    }

    /**
     * Get the user who created this product.
     * 
     * @return BelongsTo
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the product category.
     * 
     * @return BelongsTo
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get all purchase records for this product.
     * Used for inventory costing (FIFO/LIFO/WAC).
     * 
     * @return HasMany
     */
    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    /**
     * Get all invoice items containing this product.
     * 
     * @return HasMany
     */
    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function purchaseCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'purchase_currency_id');
    }
}
