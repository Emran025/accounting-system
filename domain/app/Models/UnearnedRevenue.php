<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnearnedRevenue extends Model
{
    protected $table = 'unearned_revenue';
    
    protected $fillable = [
        'receipt_date',
        'total_amount',
        'months',
        'description',
        'revenue_account_code',
        'recognized_amount',
    ];
}
