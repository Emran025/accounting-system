<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * Model representing an employee in the HR/Payroll system.
 * Extends Authenticatable to support employee self-service portal login.
 * 
 * @property int $id
 * @property string $employee_code Unique employee identifier
 * @property string $full_name Employee's full name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $national_id Saudi ID number
 * @property string|null $gosi_number GOSI registration number
 * @property \Carbon\Carbon|null $date_of_birth
 * @property string $gender (male, female)
 * @property int|null $role_id
 * @property int|null $department_id
 * @property \Carbon\Carbon $hire_date
 * @property \Carbon\Carbon|null $termination_date
 * @property string $employment_status (active, on_leave, terminated)
 * @property string $contract_type (permanent, contract, part_time)
 * @property float $vacation_days_balance
 * @property float $base_salary
 * @property string|null $iban Bank account IBAN
 * @property string|null $bank_name
 * @property int|null $account_id GL account for employee payable
 * @property int|null $manager_id Self-referencing FK for reporting hierarchy
 * @property int|null $user_id Link to Users table for system access
 * @property bool $is_active
 */
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

    /**
     * Get the role assigned to this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function role() {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the department this employee belongs to.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function department() {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the employee's direct manager (self-referencing).
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function manager() {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    /**
     * Get all employees reporting to this manager.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
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

    /**
     * Get the employee's attendance records.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function attendanceRecords() {
        return $this->hasMany(AttendanceRecord::class);
    }

    /**
     * Get the employee's leave requests.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function leaveRequests() {
        return $this->hasMany(LeaveRequest::class);
    }

    /**
     * Get all employment contracts for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function contracts() {
        return $this->hasMany(EmployeeContract::class);
    }

    /**
     * Get the employee's current active contract.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function currentContract() {
        return $this->hasOne(EmployeeContract::class)->where('is_current', true);
    }

    /**
     * Get expat management records for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function expatManagement() {
        return $this->hasOne(ExpatManagement::class);
    }

    /**
     * Get employee assets allocated to this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function assets() {
        return $this->hasMany(EmployeeAsset::class);
    }

    /**
     * Get onboarding/offboarding workflows for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function onboardingWorkflows() {
        return $this->hasMany(OnboardingWorkflow::class);
    }

    /**
     * Get employee relations cases for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function relationsCases() {
        return $this->hasMany(EmployeeRelationsCase::class);
    }

    /**
     * Get travel requests for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function travelRequests() {
        return $this->hasMany(TravelRequest::class);
    }

    /**
     * Get employee loans for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function loans() {
        return $this->hasMany(EmployeeLoan::class);
    }

    /**
     * Get performance goals for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function performanceGoals() {
        return $this->hasMany(PerformanceGoal::class);
    }

    /**
     * Get performance appraisals for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function performanceAppraisals() {
        return $this->hasMany(PerformanceAppraisal::class);
    }

    /**
     * Get continuous feedback for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function continuousFeedback() {
        return $this->hasMany(ContinuousFeedback::class);
    }

    /**
     * Get learning enrollments for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function learningEnrollments() {
        return $this->hasMany(LearningEnrollment::class);
    }

    /**
     * Get succession candidates where this employee is a candidate.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function successionCandidates() {
        return $this->hasMany(SuccessionCandidate::class);
    }

    /**
     * Get compensation entries for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function compensationEntries() {
        return $this->hasMany(CompensationEntry::class);
    }

    /**
     * Get benefits enrollments for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function benefitsEnrollments() {
        return $this->hasMany(BenefitsEnrollment::class);
    }

    /**
     * Get EHS incidents for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function ehsIncidents() {
        return $this->hasMany(EhsIncident::class);
    }

    /**
     * Get health records for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function healthRecords() {
        return $this->hasMany(EmployeeHealthRecord::class);
    }

    /**
     * Get PPE management records for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function ppeManagement() {
        return $this->hasMany(PpeManagement::class);
    }

    /**
     * Get wellness participations for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function wellnessParticipations() {
        return $this->hasMany(WellnessParticipation::class);
    }

    /**
     * Get expertise directory entries for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function expertise() {
        return $this->hasMany(ExpertiseDirectory::class);
    }

    /**
     * Get employee certifications.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function certifications() {
        return $this->hasMany(EmployeeCertification::class);
    }

    /**
     * Get schedule shifts for this employee.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function scheduleShifts() {
        return $this->hasMany(ScheduleShift::class);
    }
}
