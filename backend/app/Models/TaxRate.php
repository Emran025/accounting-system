<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tax rate with effective date range.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxRate extends Model
{
    protected $fillable = [
        'tax_type_id', 'rate', 'fixed_amount', 'effective_from', 'effective_to',
        'description', 'is_default',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_default' => 'boolean',
        ];
    }

    public function taxType(): BelongsTo
    {
        return $this->belongsTo(TaxType::class);
    }

    public function taxLines(): HasMany
    {
        return $this->hasMany(TaxLine::class);
    }
}
