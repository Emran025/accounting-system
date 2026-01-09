<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = ['name_ar', 'name_en', 'description', 'manager_id', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function manager() {
        return $this->belongsTo(Employee::class, 'manager_id');
    }
}
