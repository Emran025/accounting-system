<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OnboardingDocument extends Model
{
    protected $fillable = [
        'workflow_id', 'document_name', 'document_type', 'file_path', 'status',
        'electronic_signature', 'signed_at', 'notes'
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function workflow()
    {
        return $this->belongsTo(OnboardingWorkflow::class, 'workflow_id');
    }
}

