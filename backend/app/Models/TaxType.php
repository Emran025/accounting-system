<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Tax Type (VAT, Excise, Zero) within an authority.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxType extends Model
{
    use HasFactory;
    
    protected $fillable = ['tax_authority_id', 'code', 'name', 'gl_account_code', 'calculation_type', 'applicable_areas', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'applicable_areas' => 'array',
        ];
    }

    public function taxAuthority(): BelongsTo
    {
        return $this->belongsTo(TaxAuthority::class);
    }

    public function taxRates(): HasMany
    {
        return $this->hasMany(TaxRate::class);
    }

    public function taxLines(): HasMany
    {
        return $this->hasMany(TaxLine::class);
    }

    public function getEffectiveRate(?\DateTime $asOf = null): ?float
    {
        $asOf = $asOf ?? now();
        $date = $asOf->format('Y-m-d');

        return $this->taxRates()
            ->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->value('rate');
    }
}
