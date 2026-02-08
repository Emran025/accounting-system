<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KnowledgeBase extends Model
{
    use SoftDeletes;

    protected $table = 'knowledge_base';

    protected $fillable = [
        'title', 'content', 'category', 'tags', 'file_path', 'view_count',
        'helpful_count', 'is_published', 'created_by'
    ];

    protected $casts = [
        'tags' => 'array',
        'view_count' => 'integer',
        'helpful_count' => 'integer',
        'is_published' => 'boolean',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

