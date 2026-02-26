<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FiscalPeriod extends Model
{
    const UPDATED_AT = null;
    use HasFactory;
    protected $fillable = [
        'period_name',
        'start_date',
        'end_date',
        'is_closed',
        'is_locked',
        'closed_at',
        'closed_by',
        'locked_at',
        'locked_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_closed' => 'boolean',
            'is_locked' => 'boolean',
            'closed_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class);
    }
}
