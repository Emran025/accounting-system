<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Employee extends Authenticatable
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_code', 'full_name', 'email', 'password', 'phone',
        'national_id', 'gosi_number', 'date_of_birth', 'gender', 'address',
        'role_id', 'department_id', 'hire_date', 'termination_date',
        'employment_status', 'contract_type', 'vacation_days_balance',
        'base_salary', 'iban', 'bank_name', 'account_id', 'is_active', 'created_by', 'user_id', 'manager_id'
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'date_of_birth' => 'date',
        'hire_date' => 'date',
        'termination_date' => 'date',
        'is_active' => 'boolean',
        'base_salary' => 'decimal:2',
        'vacation_days_balance' => 'decimal:2',
    ];

    public function role() {
        return $this->belongsTo(Role::class);
    }

    public function department() {
        return $this->belongsTo(Department::class);
    }

    public function manager() {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function subordinates() {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function account() {
        return $this->belongsTo(ChartOfAccounts::class, 'account_id');
    }

    public function documents() {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function allowances() {
        return $this->hasMany(EmployeeAllowance::class);
    }

    public function deductions() {
        return $this->hasMany(EmployeeDeduction::class);
    }

    public function payrollItems() {
        return $this->hasMany(PayrollItem::class);
    }

    public function attendanceRecords() {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function leaveRequests() {
        return $this->hasMany(LeaveRequest::class);
    }

    public function contracts() {
        return $this->hasMany(EmployeeContract::class);
    }

    public function currentContract() {
        return $this->hasOne(EmployeeContract::class)->where('is_current', true);
    }
}
