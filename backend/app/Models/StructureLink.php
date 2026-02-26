<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Association matrix: Links between structure nodes.
 * Validated against TopologyRulesMatrix before insert.
 */
class StructureLink extends Model
{
    protected $table = 'structure_links';

    protected $fillable = [
        'source_node_uuid',
        'target_node_uuid',
        'topology_rule_id',
        'link_type',
        'priority',
        'valid_from',
        'valid_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'date',
            'valid_to' => 'date',
            'priority' => 'integer',
        ];
    }

    public function sourceNode(): BelongsTo
    {
        return $this->belongsTo(StructureNode::class, 'source_node_uuid', 'node_uuid');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(StructureNode::class, 'target_node_uuid', 'node_uuid');
    }

    public function topologyRule(): BelongsTo
    {
        return $this->belongsTo(TopologyRule::class);
    }

    public function isActive(): bool
    {
        if ($this->valid_to === null) {
            return true;
        }
        return $this->valid_to->isFuture();
    }
}
