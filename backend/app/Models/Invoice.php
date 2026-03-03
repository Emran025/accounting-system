<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Services\ChartOfAccountsMappingService;
use App\Models\GeneralLedger;
use App\Models\TaxLine;

/**
 * SAP FI Pattern — Invoice as a DOCUMENT, not a store of amounts.
 *
 * The invoice references entries (via voucher_number). All financial
 * data is derived from the authoritative sub-systems:
 *   - total_amount  → GL (AR debit for credit, Cash debit for cash)
 *   - subtotal      → invoice_items (SUM of line subtotals)
 *   - vat_rate/amt  → tax_lines (Tax Engine)
 *   - discount      → GL (sales_discount account entries)
 *   - amount_paid   → AR transactions (receipts linked to this invoice)
 *   - currency      → GL entries
 *
 * @property int $id
 * @property string $invoice_number
 * @property string|null $voucher_number GL voucher reference
 * @property string $payment_type ('cash', 'credit')
 * @property int|null $customer_id
 * @property int|null $user_id
 * @property bool $is_reversed
 */
class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'voucher_number',
        'payment_type',
        'customer_id',
        'sales_representative_id',
        'user_id',
        'is_reversed',
        'reversed_at',
        'reversed_by',
    ];

    protected function casts(): array
    {
        return [
            'is_reversed' => 'boolean',
            'reversed_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(ArCustomer::class, 'customer_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function zatcaEinvoice()
    {
        return $this->hasOne(ZatcaEinvoice::class);
    }

    public function taxLines()
    {
        return $this->morphMany(TaxLine::class, 'taxable');
    }

    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * Legacy fees relationship — now mapped to taxLines (Tax Engine).
     */
    public function fees(): HasMany
    {
        // Return empty hasMany for now to keep compatibility if table still exists, 
        // or a mock relationship if needed. 
        // Better: link to taxLines if we can filter by non-VAT.
        return $this->hasMany(TaxLine::class, 'taxable_id')->where('taxable_type', self::class)->where('tax_type_code', '!=', 'VAT');
    }



    public function salesRepresentative(): BelongsTo
    {
        return $this->belongsTo(SalesRepresentative::class, 'sales_representative_id');
    }

    // ─── Computed Accessors (SAP FI — derived from entries) ─────

    /**
     * Subtotal — SUM of invoice_items line totals (commercial data).
     */
    public function getSubtotalAttribute(): float
    {
        if ($this->relationLoaded('items')) {
            return (float) $this->items->sum('subtotal');
        }
        return (float) $this->items()->sum('subtotal');
    }

    /**
     * Total amount — derived from GL.
     * For credit sales: AR debit entry.
     * For cash sales: Cash debit entry.
     */
    public function getTotalAmountAttribute(): float
    {
        if ($this->voucher_number) {
            $coaService = app(ChartOfAccountsMappingService::class);
            $accounts = $coaService->getStandardAccounts();

            $targetCodes = $this->payment_type === 'credit'
                ? [$accounts['accounts_receivable']]
                : [$accounts['cash']];

            $accountIds = ChartOfAccount::whereIn('account_code', $targetCodes)->pluck('id')->toArray();
            if (!empty($accountIds)) {
                $total = (float) GeneralLedger::where('voucher_number', $this->voucher_number)
                    ->whereIn('account_id', $accountIds)
                    ->where('entry_type', 'DEBIT')
                    ->sum('amount');

                if ($total > 0) {
                    return $total;
                }
            }
        }

        // Fallback: Subtotal + VAT
        return $this->getSubtotalAttribute() + $this->getVatAmountAttribute();
    }

    /**
     * Amount paid — derived from AR receipt transactions (via GL).
     * Cash sales = total_amount (always fully paid).
     * Credit sales = sum of receipt voucher amounts from GL.
     */
    public function getAmountPaidAttribute(): float
    {
        if ($this->payment_type === 'cash' && !$this->is_reversed) {
            return $this->getTotalAmountAttribute();
        }

        // For credit: check AR receipt transactions linked to this invoice
        $receiptVouchers = ArTransaction::where('reference_type', 'invoices')
            ->where('reference_id', $this->id)
            ->whereIn('type', ['receipt', 'payment'])
            ->where('is_deleted', false)
            ->whereNotNull('voucher_number')
            ->pluck('voucher_number')
            ->toArray();

        if (empty($receiptVouchers)) {
            return 0;
        }

        $coaService = app(ChartOfAccountsMappingService::class);
        $cashAccountId = ChartOfAccount::where('account_code', $coaService->getStandardAccounts()['cash'])->value('id');

        if (!$cashAccountId) {
            return 0;
        }

        return (float) GeneralLedger::whereIn('voucher_number', $receiptVouchers)
            ->where('account_id', $cashAccountId)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }

    /**
     * VAT amount — derived from tax_lines (Tax Engine), fallback to GL.
     */
    public function getVatAmountAttribute(): float
    {
        // Primary: Tax Engine (tax_lines)
        $fromTaxLines = $this->relationLoaded('taxLines')
            ? (float) $this->taxLines->where('tax_type_code', 'VAT')->sum('tax_amount')
            : (float) $this->taxLines()->where('tax_type_code', 'VAT')->sum('tax_amount');

        if ($fromTaxLines > 0) {
            return $fromTaxLines;
        }

        // Fallback 1: GL (output_vat account)
        if ($this->voucher_number) {
            $coaService = app(ChartOfAccountsMappingService::class);
            $vatAccountCode = $coaService->getStandardAccounts()['output_vat'] ?? null;
            if ($vatAccountCode) {
                $vatAccountId = ChartOfAccount::where('account_code', $vatAccountCode)->value('id');
                if ($vatAccountId) {
                    $fromGl = (float) GeneralLedger::where('voucher_number', $this->voucher_number)
                        ->where('account_id', $vatAccountId)
                        ->where('entry_type', 'CREDIT')
                        ->sum('amount');
                    if ($fromGl > 0) {
                        return $fromGl;
                    }
                }
            }
        }

        // Fallback 2: On-the-fly calculation from items (using config rate)
        $rate = (float) config('accounting.vat_rate', 0.15);
        return round($this->getSubtotalAttribute() * $rate, 2);
    }

    /**
     * VAT rate — derived from tax_lines (Tax Engine).
     */
    public function getVatRateAttribute(): float
    {
        $vatLine = $this->relationLoaded('taxLines')
            ? $this->taxLines->firstWhere('tax_type_code', 'VAT')
            : $this->taxLines()->where('tax_type_code', 'VAT')->first();

        return $vatLine ? (float) $vatLine->rate * 100 : (float)config('accounting.vat_rate', 0.15) * 100;
    }

    /**
     * Discount amount — derived from GL (sales_discount account entries).
     */
    public function getDiscountAmountAttribute(): float
    {
        if (!$this->voucher_number) {
            return 0;
        }

        $coaService = app(\App\Services\ChartOfAccountsMappingService::class);
        $discountAccountCode = $coaService->getStandardAccounts()['sales_discount'] ?? null;
        if (!$discountAccountCode) {
            return 0;
        }

        $discountAccountId = ChartOfAccount::where('account_code', $discountAccountCode)->value('id');
        if (!$discountAccountId) {
            return 0;
        }

        return (float) GeneralLedger::where('voucher_number', $this->voucher_number)
            ->where('account_id', $discountAccountId)
            ->sum('amount');
    }

    /**
     * Currency — from GL entries (SAP FI: currency on GL, not document).
     */
    public function getCurrencyAttribute()
    {
        $glEntry = $this->glEntries()->whereNotNull('currency_id')->first();
        return $glEntry ? Currency::find($glEntry->currency_id) : null;
    }
}
