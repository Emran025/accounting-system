<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollEntry extends Model
{
    protected $fillable = [
        'payroll_date',
        'gross_pay',
        'deductions',
        'net_pay',
        'description',
        'status',
    ];
}
