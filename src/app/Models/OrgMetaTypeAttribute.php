<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Dynamic attributes for each Org Meta Type (schema-less configuration).
 */
class OrgMetaTypeAttribute extends Model
{
    protected $table = 'org_meta_type_attributes';

    protected $fillable = [
        'org_meta_type_id',
        'attribute_key',
        'attribute_type',
        'is_mandatory',
        'default_value',
        'validation_rule',
        'reference_type_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
            'validation_rule' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function metaType(): BelongsTo
    {
        return $this->belongsTo(OrgMetaType::class, 'org_meta_type_id', 'id');
    }
}
