<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Number Range Interval — a numeric range [from_number .. to_number].
 *
 * @property int         $id
 * @property int         $nr_object_id
 * @property string      $code
 * @property string|null $description
 * @property int         $from_number
 * @property int         $to_number
 * @property int         $current_number   Last assigned number (0 = not started)
 * @property bool        $is_external      true = manual external numbering
 * @property bool        $is_active
 * @property int|null    $created_by
 */
class NrInterval extends Model
{
    use HasFactory;

    protected $fillable = [
        'nr_object_id',
        'code',
        'description',
        'from_number',
        'to_number',
        'current_number',
        'is_external',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'from_number'    => 'integer',
            'to_number'      => 'integer',
            'current_number' => 'integer',
            'is_external'    => 'boolean',
            'is_active'      => 'boolean',
        ];
    }

    // ── Computed Attributes ───────────────────────────────────────

    /**
     * Total capacity of this interval.
     */
    public function getCapacityAttribute(): int
    {
        return $this->to_number - $this->from_number + 1;
    }

    /**
     * Numbers consumed so far.
     */
    public function getUsedAttribute(): int
    {
        if ($this->current_number === 0) {
            return 0;
        }
        return $this->current_number - $this->from_number + 1;
    }

    /**
     * Remaining free numbers.
     */
    public function getRemainingAttribute(): int
    {
        return $this->capacity - $this->used;
    }

    /**
     * Fullness percentage (0-100).
     */
    public function getFullnessPercentAttribute(): float
    {
        if ($this->capacity === 0) {
            return 100;
        }
        return round(($this->used / $this->capacity) * 100, 2);
    }

    // ── Relationships ────────────────────────────────────────────

    public function object(): BelongsTo
    {
        return $this->belongsTo(NrObject::class, 'nr_object_id');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(NrGroup::class, 'nr_group_interval_assignments', 'nr_interval_id', 'nr_group_id')
                    ->withPivot('is_active', 'created_by')
                    ->withTimestamps();
    }

    public function expansionLogs(): HasMany
    {
        return $this->hasMany(NrExpansionLog::class, 'nr_interval_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
