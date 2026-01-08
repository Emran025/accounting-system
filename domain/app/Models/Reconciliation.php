<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reconciliation extends Model
{
    protected $fillable = [
        'reconciliation_date',
        'bank_balance',
        'ledger_balance',
        'difference',
        'notes',
    ];
}
