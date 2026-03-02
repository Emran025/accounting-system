<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UniversalJournal extends Model
{
    use HasFactory;

    protected $fillable = [
        'voucher_number',
        'document_type',
        'document_summary',
    ];

    /**
     * Get the route key for the model.
     *
     * @return string
     */
    public function getRouteKeyName()
    {
        return 'voucher_number';
    }

    public function generalLedgerEntries()
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }
}
