<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prepayment extends Model
{
    protected $fillable = [
        'prepayment_date',
        'total_amount',
        'months',
        'description',
        'expense_account_code',
        'amortized_amount',
    ];
}
