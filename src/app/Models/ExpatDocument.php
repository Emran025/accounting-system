<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExpatDocument extends Model
{
    protected $fillable = [
        'expat_id', 'document_type', 'document_name', 'file_path', 'expiry_date', 'notes', 'created_by'
    ];

    protected $casts = [
        'expiry_date' => 'date',
    ];

    public function expat()
    {
        return $this->belongsTo(ExpatManagement::class, 'expat_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

