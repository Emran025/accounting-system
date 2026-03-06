<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Expansion Log — immutable audit entry for range boundary changes.
 *
 * @property int         $id
 * @property int         $nr_interval_id
 * @property int         $old_from
 * @property int         $old_to
 * @property int         $new_from
 * @property int         $new_to
 * @property string|null $reason
 * @property int|null    $expanded_by
 */
class NrExpansionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'nr_interval_id',
        'old_from',
        'old_to',
        'new_from',
        'new_to',
        'reason',
        'expanded_by',
    ];

    protected function casts(): array
    {
        return [
            'old_from' => 'integer',
            'old_to'   => 'integer',
            'new_from' => 'integer',
            'new_to'   => 'integer',
        ];
    }

    // ── Relationships ────────────────────────────────────────────

    public function interval(): BelongsTo
    {
        return $this->belongsTo(NrInterval::class, 'nr_interval_id');
    }

    public function expandedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'expanded_by');
    }
}
