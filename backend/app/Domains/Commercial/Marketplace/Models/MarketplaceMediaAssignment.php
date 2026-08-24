<?php

namespace App\Domains\Commercial\Marketplace\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MarketplaceMediaAssignment extends Model
{
    use HasUuids;

    protected $fillable = ['media_asset_id', 'assignable_type', 'assignable_id', 'role', 'sort_order'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMediaAsset::class, 'media_asset_id');
    }

    public function assignable(): MorphTo
    {
        return $this->morphTo();
    }
}
