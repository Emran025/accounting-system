<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model representing a sales invoice.
 * Core entity for the Sales module with GL integration, ZATCA e-invoicing,
 * and multi-currency support.
 * 
 * @property int $id
 * @property string $invoice_number Unique invoice identifier
 * @property string $voucher_number GL voucher reference
 * @property float $total_amount Final invoice total (including VAT)
 * @property float $subtotal Pre-VAT subtotal
 * @property float $vat_rate VAT percentage applied
 * @property float $vat_amount Calculated VAT amount
 * @property float $discount_amount Applied discount
 * @property string $payment_type ('cash', 'credit')
 * @property int|null $customer_id AR Customer FK
 * @property float $amount_paid For installment tracking
 * @property int $user_id Cashier/Creator
 * @property bool $is_reversed Whether invoice has been reversed
 * @property \Carbon\Carbon|null $reversed_at Reversal timestamp
 * @property int|null $reversed_by User who performed reversal
 * @property int|null $currency_id Multi-currency FK
 * @property float $exchange_rate Exchange rate at time of sale
 */
class Invoice extends Model
{
    use HasFactory;
    protected $fillable = [
        'invoice_number',
        'voucher_number',
        'total_amount',
        'subtotal',
        'vat_rate',
        'vat_amount',
        'discount_amount',
        'payment_type',
        'customer_id',
        'amount_paid',
        'user_id',
        'is_reversed',
        'reversed_at',
        'reversed_by',
        'currency_id',
        'exchange_rate',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'vat_rate' => 'decimal:2',
            'vat_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'is_reversed' => 'boolean',
            'reversed_at' => 'datetime',
        ];
    }

    /**
     * Get the user (cashier) who created this invoice.
     * 
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the customer associated with this invoice (for credit sales).
     * 
     * @return BelongsTo
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(ArCustomer::class, 'customer_id');
    }

    /**
     * Get the line items for this invoice.
     * 
     * @return HasMany
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function fees(): HasMany
    {
        return $this->hasMany(InvoiceFee::class);
    }

    public function zatcaEinvoice()
    {
        return $this->hasOne(ZatcaEinvoice::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
}
