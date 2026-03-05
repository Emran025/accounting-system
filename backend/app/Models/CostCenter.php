<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cost Center — groups costs for allocation and reporting.
 *
 * Supports hierarchy (parent_id) so departments, projects, or
 * production lines can nest under higher-level centres.
 *
 * @property int    $id
 * @property string $code            Unique short code (e.g. CC-001)
 * @property string $name            Arabic display name
 * @property string|null $name_en    Optional English name
 * @property int|null $parent_id     Parent cost centre for hierarchy
 * @property int|null $account_id    Linked Chart-of-Account entry
 * @property int|null $manager_id    Responsible employee
 * @property float|null $budget      Allocated budget
 * @property string $type            operational | administrative | production | support
 * @property string|null $description
 * @property bool   $is_active
 * @property int|null $created_by
 */
class CostCenter extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'name_en',
        'parent_id',
        'account_id',
        'manager_id',
        'budget',
        'type',
        'description',
        'is_active',
        'created_by',
        'structure_node_uuid',
    ];

    protected function casts(): array
    {
        return [
            'budget'    => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function parent(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(CostCenter::class, 'parent_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
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
        return $this->hasMany(GeneralLedger::class, 'cost_center_id');
    }

    /**
     * Get the linked org-chart structure node.
     */
    public function structureNode(): BelongsTo
    {
        return $this->belongsTo(StructureNode::class, 'structure_node_uuid', 'node_uuid');
    }
}
