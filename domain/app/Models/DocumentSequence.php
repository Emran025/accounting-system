<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentSequence extends Model
{
    protected $fillable = [
        'document_type',
        'prefix',
        'current_number',
        'format',
    ];

    public $timestamps = false;
    const UPDATED_AT = 'updated_at';

    protected function casts(): array
    {
        return [
            'current_number' => 'integer',
        ];
    }
}
