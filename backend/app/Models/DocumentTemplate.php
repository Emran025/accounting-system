<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentTemplate extends Model
{
    protected $fillable = [
        'template_key', 'template_name_ar', 'template_name_en', 'template_type',
        'body_html', 'editable_fields', 'description', 'is_active', 'created_by'
    ];

    protected $casts = [
        'editable_fields' => 'array',
        'is_active'       => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function histories()
    {
        return $this->hasMany(DocumentTemplateHistory::class, 'document_template_id')->orderBy('created_at', 'desc');
    }

    /**
     * Scope: only active templates.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: filter by template type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('template_type', $type);
    }
}
