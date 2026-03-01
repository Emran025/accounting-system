<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\TaxLine;

/**
 * SalesReturn model — SAP FI pattern.
 * Tax data (vat_amount, fees_amount) lives in tax_lines (Tax Engine).
 */
class SalesReturn extends Model
{
    protected $fillable = [
        'return_number',
        'invoice_id',
        'total_amount',
        'subtotal',
        'reason',
        'user_id',
        'voucher_number',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    /**
     * Tax lines — Tax Engine is the authoritative source for tax data.
     */
    public function taxLines()
    {
        return $this->morphMany(TaxLine::class, 'taxable');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * VAT amount — derived from tax_lines (Tax Engine).
     */
    public function getVatAmountAttribute(): float
    {
        if ($this->relationLoaded('taxLines')) {
            return (float) $this->taxLines
                ->where('tax_type_code', 'VAT')
                ->sum('tax_amount');
        }
        return (float) $this->taxLines()
            ->where('tax_type_code', 'VAT')
            ->sum('tax_amount');
    }

    /**
     * Fees amount — derived from tax_lines (non-VAT tax types).
     */
    public function getFeesAmountAttribute(): float
    {
        if ($this->relationLoaded('taxLines')) {
            return (float) $this->taxLines
                ->where('tax_type_code', '!=', 'VAT')
                ->sum('tax_amount');
        }
        return (float) $this->taxLines()
            ->where('tax_type_code', '!=', 'VAT')
            ->sum('tax_amount');
    }
}
