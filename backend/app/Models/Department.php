<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Department extends Model
{
    use HasFactory;
    protected $fillable = ['name_ar', 'name_en', 'description', 'manager_id', 'cost_center_id', 'profit_center_id', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function manager() {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function costCenter() {
        return $this->belongsTo(CostCenter::class);
    }

    public function profitCenter() {
        return $this->belongsTo(ProfitCenter::class);
    }
}
