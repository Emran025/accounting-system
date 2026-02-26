<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'fee_id',
        'fee_name',
        'fee_percentage',
        'amount'
    ];

    protected $casts = [
        'fee_percentage' => 'decimal:2',
        'amount' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function feeDefinition()
    {
        return $this->belongsTo(GovernmentFee::class, 'fee_id');
    }
}
