<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeAllowance extends Model
{
    protected $fillable = ['employee_id', 'allowance_name', 'amount', 'frequency', 'start_date', 'end_date', 'is_active'];
    protected $casts = ['start_date' => 'date', 'end_date' => 'date', 'is_active' => 'boolean', 'amount' => 'decimal:2'];

    public function employee() {
        return $this->belongsTo(Employee::class);
    }
}
