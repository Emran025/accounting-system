<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Entity Meta-Registry: Defines organizational object types (e.g. Company Code, Plant).
 * SAP SPRO-style: Dynamic type definition without code changes.
 */
class OrgMetaType extends Model
{
    protected $table = 'org_meta_types';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'display_name',
        'display_name_ar',
        'level_domain',
        'description',
        'is_assignable',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_assignable' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(OrgMetaTypeAttribute::class, 'org_meta_type_id', 'id');
    }

    public function sourceRules(): HasMany
    {
        return $this->hasMany(TopologyRule::class, 'source_node_type_id', 'id');
    }

    public function targetRules(): HasMany
    {
        return $this->hasMany(TopologyRule::class, 'target_node_type_id', 'id');
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(StructureNode::class, 'node_type_id', 'id');
    }

    public function getMandatoryAttributes(): array
    {
        return $this->attributes()
            ->where('is_mandatory', true)
            ->orderBy('sort_order')
            ->pluck('attribute_key')
            ->toArray();
    }
}
