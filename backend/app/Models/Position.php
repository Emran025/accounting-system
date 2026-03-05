<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Position model - The central entity linking the HR hierarchy chain.
 * 
 * Relationship chain:
 *   Employee ← Position ← Role ← Permissions (RolePermission)
 *   Position ← JobTitle
 * 
 * @property int $id
 * @property string $position_code
 * @property string $position_name_ar
 * @property string|null $position_name_en
 * @property int $job_title_id
 * @property int|null $role_id
 * @property int|null $department_id
 * @property string|null $grade_level
 * @property float|null $min_salary
 * @property float|null $max_salary
 * @property string|null $description
 * @property bool $is_active
 * @property int|null $created_by
 */
class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'position_code',
        'position_name_ar',
        'position_name_en',
        'job_title_id',
        'role_id',
        'department_id',
        'cost_center_id',
        'grade_level',
        'min_salary',
        'max_salary',
        'description',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'min_salary' => 'decimal:2',
        'max_salary' => 'decimal:2',
    ];

    /**
     * Get the job title this position belongs to.
     */
    public function jobTitle(): BelongsTo
    {
        return $this->belongsTo(JobTitle::class);
    }

    /**
     * Get the role assigned to this position.
     * Through the role, permissions are inherited.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the department this position belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get all employees assigned to this position.
     */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * Get the cost centre this position is allocated to.
     */
    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class);
    }

    /**
     * Get the user who created this position.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get current active employee count for this position.
     */
    public function getActiveEmployeeCountAttribute(): int
    {
        return $this->employees()->where('is_active', true)->count();
    }

    /**
     * Generate the next position code.
     */
    public static function generateCode(): string
    {
        $last = static::orderByDesc('id')->value('position_code');
        if ($last && preg_match('/POS-(\d+)/', $last, $m)) {
            $next = intval($m[1]) + 1;
        } else {
            $next = 1;
        }
        return 'POS-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }
}
