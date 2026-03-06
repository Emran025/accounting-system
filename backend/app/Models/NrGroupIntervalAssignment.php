<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Group ↔ Interval assignment pivot model.
 *
 * @property int      $id
 * @property int      $nr_object_id
 * @property int      $nr_group_id
 * @property int      $nr_interval_id
 * @property bool     $is_active
 * @property int|null $created_by
 */
class NrGroupIntervalAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'nr_object_id',
        'nr_group_id',
        'nr_interval_id',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────

    public function object(): BelongsTo
    {
        return $this->belongsTo(NrObject::class, 'nr_object_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(NrGroup::class, 'nr_group_id');
    }

    public function interval(): BelongsTo
    {
        return $this->belongsTo(NrInterval::class, 'nr_interval_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
