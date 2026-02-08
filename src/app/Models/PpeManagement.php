<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PpeManagement extends Model
{
    protected $table = 'ppe_management';

    protected $fillable = [
        'employee_id', 'ppe_item', 'ppe_type', 'issue_date', 'expiry_date',
        'return_date', 'status', 'notes'
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
        'return_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

