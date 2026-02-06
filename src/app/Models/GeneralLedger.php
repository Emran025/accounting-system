<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing a General Ledger entry (journal entry line).
 * Core entity for double-entry accounting. Each transaction creates
 * at least two entries (debit and credit) with matching voucher_number.
 * 
 * @property int $id
 * @property string $voucher_number Groups entries into a single transaction
 * @property \Carbon\Carbon $voucher_date Transaction date (used for reporting)
 * @property int $account_id Chart of Account FK
 * @property string $entry_type ('DEBIT' or 'CREDIT')
 * @property float $amount Entry amount (always positive)
 * @property string|null $description Entry narration
 * @property string|null $reference_type Source module (invoices, purchases, payroll)
 * @property int|null $reference_id Source record ID
 * @property int|null $fiscal_period_id Fiscal period FK for period locking
 * @property bool $is_closed Whether entry is in a closed period
 * @property int|null $created_by User who created the entry
 */
class GeneralLedger extends Model
{
    const UPDATED_AT = null;
    use HasFactory;
    public $timestamps = false;
    protected $table = 'general_ledger';

    protected $fillable = [
        'voucher_number',
        'voucher_date',
        'account_id',
        'entry_type',
        'amount',
        'description',
        'reference_type',
        'reference_id',
        'fiscal_period_id',
        'is_closed',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'voucher_date' => 'date',
            'is_closed' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the Chart of Account for this entry.
     * 
     * @return BelongsTo
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    /**
     * Get the fiscal period this entry belongs to.
     * Used for period-based locking and reporting.
     * 
     * @return BelongsTo
     */
    public function fiscalPeriod(): BelongsTo
    {
        return $this->belongsTo(FiscalPeriod::class);
    }

    /**
     * Get the user who created this entry.
     * 
     * @return BelongsTo
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
