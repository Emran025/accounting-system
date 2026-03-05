<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Profit Center — groups revenues and expenses for profitability reporting.
 *
 * Each profit centre can track a business unit, product line, region,
 * or branch.  Revenue and expense target fields enable variance analysis.
 *
 * @property int    $id
 * @property string $code                Unique short code (e.g. PC-001)
 * @property string $name                Arabic display name
 * @property string|null $name_en        Optional English name
 * @property int|null $parent_id         Parent profit centre for hierarchy
 * @property int|null $revenue_account_id Linked revenue CoA entry
 * @property int|null $expense_account_id Linked expense CoA entry
 * @property int|null $manager_id        Responsible employee
 * @property float|null $revenue_target  Target revenue
 * @property float|null $expense_budget  Expense budget
 * @property string $type                business_unit | product_line | region | branch
 * @property string|null $description
 * @property bool   $is_active
 * @property int|null $created_by
 */
class ProfitCenter extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'name_en',
        'parent_id',
        'revenue_account_id',
        'expense_account_id',
        'manager_id',
        'revenue_target',
        'expense_budget',
        'type',
        'description',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'revenue_target' => 'decimal:2',
            'expense_budget' => 'decimal:2',
            'is_active'      => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProfitCenter::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ProfitCenter::class, 'parent_id');
    }

    public function revenueAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'revenue_account_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'expense_account_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'profit_center_id');
    }
}
