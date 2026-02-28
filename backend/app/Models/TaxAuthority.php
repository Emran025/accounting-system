<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tax Authority (ZATCA, FTA, etc.) - jurisdiction-level tax regulator.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxAuthority extends Model
{
    protected $fillable = [
        'code', 'name', 'country_code', 'adapter_class', 'config',
        'connection_type', 'connection_credentials', 'endpoint_url',
        'is_active', 'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'is_active' => 'boolean',
            'is_primary' => 'boolean',
        ];
    }

    public function taxTypes(): HasMany
    {
        return $this->hasMany(TaxType::class);
    }

    public function taxLines(): HasMany
    {
        return $this->hasMany(TaxLine::class);
    }

    public function complianceProfiles(): HasMany
    {
        return $this->hasMany(ComplianceProfile::class);
    }

    public static function getPrimaryForCountry(string $countryCode = 'SA'): ?self
    {
        return static::where('country_code', $countryCode)
            ->where('is_primary', true)
            ->where('is_active', true)
            ->first();
    }
}
