<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model representing a Chart of Account entry.
 * Supports hierarchical account structure with parent-child relationships.
 * Account types: asset, liability, equity, revenue, expense.
 * 
 * @property int $id
 * @property string $account_code Unique account identifier (e.g., '1110')
 * @property string $account_name Display name
 * @property string $account_type One of: asset, liability, equity, revenue, expense
 * @property int|null $parent_id Parent account for hierarchy
 * @property bool $is_active Whether account can be used for posting
 * @property string|null $description Account purpose description
 */
class ChartOfAccount extends Model
{
    use HasFactory;
    protected $fillable = [
        'account_code',
        'account_name',
        'account_type',
        'parent_id',
        'is_active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the parent account in the hierarchy.
     * 
     * @return BelongsTo
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get child accounts in the hierarchy.
     * Leaf accounts (no children) are used for posting.
     * 
     * @return HasMany
     */
    public function children(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get all General Ledger entries posted to this account.
     * 
     * @return HasMany
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'account_id');
    }
}
