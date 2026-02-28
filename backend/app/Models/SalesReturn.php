<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\TaxLine;

class SalesReturn extends Model
{
    protected $fillable = [
        'return_number',
        'invoice_id',
        'total_amount',
        'subtotal',
        'vat_amount',
        'fees_amount',
        'reason',
        'user_id',
        'voucher_number',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'vat_amount' => 'decimal:2',
            'fees_amount' => 'decimal:2',
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

    public function taxLines()
    {
        return $this->morphMany(TaxLine::class, 'taxable');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
