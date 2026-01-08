<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginAttempt extends Model
{
    protected $fillable = [
        'username',
        'attempts',
        'last_attempt',
        'locked_until',
    ];

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'last_attempt' => 'datetime',
            'locked_until' => 'datetime',
        ];
    }
}
