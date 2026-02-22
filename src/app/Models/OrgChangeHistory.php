<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Org Change History — SAP Change Documents (SCDO) equivalent.
 * Tracks every create/update/delete on nodes, links, and rules.
 */
class OrgChangeHistory extends Model
{
    protected $table = 'org_change_history';

    protected $fillable = [
        'entity_type',
        'entity_id',
        'change_type',
        'old_values',
        'new_values',
        'change_reason',
        'changed_by',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
