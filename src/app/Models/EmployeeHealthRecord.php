<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeHealthRecord extends Model
{
    protected $fillable = [
        'employee_id', 'record_type', 'record_date', 'expiry_date', 'provider_name',
        'results', 'file_path', 'notes'
    ];

    protected $casts = [
        'record_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

