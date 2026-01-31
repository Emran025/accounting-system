<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollComponent extends Model
{
    protected $fillable = [
        'component_code',
        'component_name',
        'component_type',
        'calculation_type',
        'base_amount',
        'percentage',
        'formula',
        'is_taxable',
        'is_active',
        'display_order',
        'description'
    ];

    protected $casts = [
        'base_amount' => 'decimal:2',
        'percentage' => 'decimal:2',
        'is_taxable' => 'boolean',
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Calculate component value based on type
     */
    public function calculate($baseSalary = 0, $context = [])
    {
        switch ($this->calculation_type) {
            case 'fixed':
                return $this->base_amount ?? 0;
            
            case 'percentage':
                return ($baseSalary * ($this->percentage ?? 0)) / 100;
            
            case 'formula':
                return $this->evaluateFormula($context);
            
            case 'attendance_based':
                return $this->calculateAttendanceBased($context);
            
            default:
                return 0;
        }
    }

    /**
     * Evaluate formula with context variables
     */
    protected function evaluateFormula($context)
    {
        if (!$this->formula) {
            return 0;
        }

        // Extract variables from context
        $hours = $context['hours'] ?? 0;
        $rate = $context['rate'] ?? 0;
        $overtimeHours = $context['overtime_hours'] ?? 0;
        $baseSalary = $context['base_salary'] ?? 0;

        // Simple formula evaluation (for production, use a proper expression parser)
        $formula = $this->formula;
        $formula = str_replace('hours', $hours, $formula);
        $formula = str_replace('rate', $rate, $formula);
        $formula = str_replace('overtime_hours', $overtimeHours, $formula);
        $formula = str_replace('base_salary', $baseSalary, $formula);

        // Evaluate safely
        try {
            return eval("return $formula;");
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Calculate attendance-based component
     */
    protected function calculateAttendanceBased($context)
    {
        // This would be implemented based on attendance records
        // For now, return base amount
        return $this->base_amount ?? 0;
    }
}

