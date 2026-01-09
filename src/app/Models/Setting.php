<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public $incrementing = false;
    protected $primaryKey = 'setting_key';
    protected $keyType = 'string';

    protected $fillable = [
        'setting_key',
        'setting_value',
    ];

    public $timestamps = false;
    const UPDATED_AT = 'updated_at';

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
        ];
    }
}
