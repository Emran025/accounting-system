<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Asset extends Model
{
    use HasFactory;
    protected $fillable = [
        'name',
        'purchase_value',
        'purchase_date',
        'salvage_value',
        'useful_life_years',
        'depreciation_method',
        'accumulated_depreciation',
        'depreciation_rate',
        'description',
        'status',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'purchase_value' => 'decimal:2',
            'salvage_value' => 'decimal:2',
            'accumulated_depreciation' => 'decimal:2',
            'depreciation_rate' => 'decimal:2',
            'purchase_date' => 'date',
            'is_active' => 'boolean',
            'useful_life_years' => 'integer',
        ];
    }


    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
