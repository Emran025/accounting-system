<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Number Range Object — defines a numbering context for an entity type.
 *
 * @property int         $id
 * @property string      $object_type      Unique key (employees, customers, etc.)
 * @property string      $name             Arabic display name
 * @property string|null $name_en          English display name
 * @property string|null $description
 * @property int         $number_length    Total digit width for generated numbers
 * @property string|null $prefix           Optional prefix (EMP-)
 * @property bool        $is_active
 * @property int|null    $created_by
 */
class NrObject extends Model
{
    use HasFactory;

    protected $fillable = [
        'object_type',
        'name',
        'name_en',
        'description',
        'number_length',
        'prefix',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'number_length' => 'integer',
            'is_active'     => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────

    public function groups(): HasMany
    {
        return $this->hasMany(NrGroup::class, 'nr_object_id');
    }

    public function intervals(): HasMany
    {
        return $this->hasMany(NrInterval::class, 'nr_object_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(NrGroupIntervalAssignment::class, 'nr_object_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
