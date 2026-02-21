<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentTemplateHistory extends Model
{
    protected $table = 'document_template_histories';

    protected $fillable = [
        'document_template_id',
        'body_html',
        'created_by'
    ];

    public function template()
    {
        return $this->belongsTo(DocumentTemplate::class, 'document_template_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
