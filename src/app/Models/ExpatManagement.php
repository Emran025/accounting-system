<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpatManagement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'passport_number', 'passport_expiry', 'visa_number', 'visa_expiry',
        'work_permit_number', 'work_permit_expiry', 'residency_number', 'residency_expiry',
        'host_country', 'home_country', 'cost_of_living_adjustment', 'housing_allowance',
        'relocation_package', 'tax_equalization', 'repatriation_date', 'notes', 'created_by'
    ];

    protected $casts = [
        'passport_expiry' => 'date',
        'visa_expiry' => 'date',
        'work_permit_expiry' => 'date',
        'residency_expiry' => 'date',
        'repatriation_date' => 'date',
        'cost_of_living_adjustment' => 'decimal:2',
        'housing_allowance' => 'decimal:2',
        'relocation_package' => 'decimal:2',
        'tax_equalization' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function documents()
    {
        return $this->hasMany(ExpatDocument::class, 'expat_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

