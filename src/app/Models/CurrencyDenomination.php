<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurrencyDenomination extends Model
{
    use HasFactory;

    protected $fillable = [
        'currency_id',
        'value',
        'label',
        'image_path',
    ];

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }
}
