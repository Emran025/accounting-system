<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralLedger extends Model
{
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

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function fiscalPeriod(): BelongsTo
    {
        return $this->belongsTo(FiscalPeriod::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
