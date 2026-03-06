<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Number Range Group — a classification bucket within an NR Object.
 *
 * @property int         $id
 * @property int         $nr_object_id
 * @property string      $code
 * @property string      $name
 * @property string|null $name_en
 * @property string|null $description
 * @property bool        $is_active
 * @property int|null    $created_by
 */
class NrGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'nr_object_id',
        'code',
        'name',
        'name_en',
        'description',
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

    public function intervals(): BelongsToMany
    {
        return $this->belongsToMany(NrInterval::class, 'nr_group_interval_assignments', 'nr_group_id', 'nr_interval_id')
                    ->withPivot('is_active', 'created_by')
                    ->withTimestamps();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
