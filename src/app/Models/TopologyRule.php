<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Topology Rules Matrix: Defines valid link relationships between node types.
 * Enforces cardinality and constraint logic (e.g. Plant N:1 Company Code).
 */
class TopologyRule extends Model
{
    protected $table = 'topology_rules_matrix';

    protected $fillable = [
        'source_node_type_id',
        'target_node_type_id',
        'cardinality',
        'link_direction',
        'constraint_logic',
        'is_active',
        'description',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'constraint_logic' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function sourceType(): BelongsTo
    {
        return $this->belongsTo(OrgMetaType::class, 'source_node_type_id', 'id');
    }

    public function targetType(): BelongsTo
    {
        return $this->belongsTo(OrgMetaType::class, 'target_node_type_id', 'id');
    }

    public function links(): HasMany
    {
        return $this->hasMany(StructureLink::class, 'topology_rule_id');
    }
}
