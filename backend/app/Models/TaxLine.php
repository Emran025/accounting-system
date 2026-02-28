<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Immutable tax line - audit trail for each tax calculation.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxLine extends Model
{
    protected $fillable = [
        'taxable_type', 'taxable_id', 'tax_authority_id', 'tax_type_id', 'tax_rate_id',
        'rate', 'taxable_amount', 'tax_amount',
        'tax_type_code', 'tax_authority_code', 'metadata', 'line_order',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'taxable_amount' => 'decimal:4',
            'tax_amount' => 'decimal:4',
            'metadata' => 'array',
        ];
    }

    public function taxable(): MorphTo
    {
        return $this->morphTo();
    }

    public function taxAuthority(): BelongsTo
    {
        return $this->belongsTo(TaxAuthority::class);
    }

    public function taxType(): BelongsTo
    {
        return $this->belongsTo(TaxType::class);
    }

    public function taxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class);
    }
}
