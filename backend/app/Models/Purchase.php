<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\TaxLine;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Services\ChartOfAccountsMappingService;

/**
 * Purchase model — SAP FI pattern.
 * Tax data (vat_rate, vat_amount) lives in tax_lines (Tax Engine).
 * Currency lives on GL entries.
 */
class Purchase extends Model
{
    const UPDATED_AT = null;

    use HasFactory;

    protected $fillable = [
        'product_id',
        'quantity',
        'invoice_price',
        'unit_type',
        'production_date',
        'expiry_date',
        'user_id',
        'supplier_id',
        'payment_type',
        'voucher_number',
        'notes',
        'approval_status',
        'approved_by',
        'approved_at',
        'is_reversed',
        'reversed_at',
        'reversed_by',
        'purchase_date',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'invoice_price' => 'decimal:2',
            'is_reversed' => 'boolean',
            'production_date' => 'date',
            'expiry_date' => 'date',
            'approved_at' => 'datetime',
            'reversed_at' => 'datetime',
            'purchase_date' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(ApSupplier::class, 'supplier_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    /**
     * GL entries for this purchase.
     */
    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * VAT amount — derived from tax_lines (Tax Engine), fallback to GL.
     */
    public function getVatAmountAttribute(): float
    {
        // Primary: Tax Engine
        $fromTaxLines = $this->relationLoaded('taxLines')
            ? (float) $this->taxLines->sum('tax_amount')
            : (float) $this->taxLines()->sum('tax_amount');

        if ($fromTaxLines > 0) {
            return $fromTaxLines;
        }

        // Secondary: GL (input_vat account)
        if ($this->voucher_number) {
            $coaService = app(ChartOfAccountsMappingService::class);
            $vatAccountCode = $coaService->getStandardAccounts()['input_vat'] ?? null;
            if ($vatAccountCode) {
                $vatAccountId = ChartOfAccount::where('account_code', $vatAccountCode)->value('id');
                if ($vatAccountId) {
                    $fromGl = (float) GeneralLedger::where('voucher_number', $this->voucher_number)
                        ->where('account_id', $vatAccountId)
                        ->where('entry_type', 'DEBIT')
                        ->sum('amount');
                    if ($fromGl > 0) {
                        return $fromGl;
                    }
                }
            }
        }

        // Tertiary: Calculate from invoice_price for PENDING or NO-GL docs
        $rate = (float) config('accounting.vat_rate', 0.15);
        return round((float)$this->invoice_price * ($rate / (1 + $rate)), 2);
    }

    /**
     * VAT rate — derived from tax_lines (Tax Engine).
     */
    public function getVatRateAttribute(): float
    {
        $vatLine = $this->relationLoaded('taxLines')
            ? $this->taxLines->first()
            : $this->taxLines()->first();

        return $vatLine ? (float) $vatLine->rate * 100 : (float)config('accounting.vat_rate', 0.15) * 100;
    }

    /**
     * Currency from GL entries (SAP FI pattern).
     */
    public function getCurrencyAttribute()
    {
        $glEntry = $this->glEntries()->whereNotNull('currency_id')->first();
        return $glEntry ? Currency::find($glEntry->currency_id) : null;
    }
}
