<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecurringTransaction extends Model
{
    protected $fillable = [
        'name',
        'type',
        'frequency',
        'next_due_date',
        'last_generated_date',
        'template_data',
    ];

    protected $casts = [
        'template_data' => 'array',
    ];
}
