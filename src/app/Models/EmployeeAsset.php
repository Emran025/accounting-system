<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeAsset extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'asset_code', 'asset_name', 'asset_type', 'serial_number', 'qr_code',
        'allocation_date', 'return_date', 'status', 'notes', 'cost_center_id', 'project_id',
        'next_maintenance_date', 'maintenance_notes', 'digital_signature_path', 'created_by'
    ];

    protected $casts = [
        'allocation_date' => 'date',
        'return_date' => 'date',
        'next_maintenance_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function costCenter()
    {
        return $this->belongsTo(ChartOfAccounts::class, 'cost_center_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

