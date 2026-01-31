<?php

namespace App\Services;

use App\Models\Employee;
use Carbon\Carbon;

class EOSBCalculatorService
{
    /**
     * Calculate End of Service Benefits (EOSB) according to Saudi Labor Law
     * 
     * @param Employee $employee
     * @param string $terminationDate
     * @param string $terminationReason 'resignation' | 'termination' | 'end_of_contract'
     * @return array
     */
    public function calculate(Employee $employee, string $terminationDate, string $terminationReason): array
    {
        $hireDate = Carbon::parse($employee->hire_date);
        $terminationDate = Carbon::parse($terminationDate);
        
        $yearsOfService = $hireDate->diffInYears($terminationDate);
        $monthsOfService = $hireDate->diffInMonths($terminationDate);
        $daysOfService = $hireDate->diffInDays($terminationDate);

        $lastSalary = $employee->base_salary;
        $allowances = $employee->allowances()->where('is_active', true)->sum('amount');
        $lastGrossSalary = $lastSalary + $allowances;

        $eosb = 0;
        $unusedVacation = 0;
        $noticePeriod = 0;

        // Calculate unused vacation days
        if ($employee->vacation_days_balance > 0) {
            $dailyRate = $lastGrossSalary / 30; // Assuming 30 days per month
            $unusedVacation = $employee->vacation_days_balance * $dailyRate;
        }

        // Calculate EOSB based on termination reason
        if ($terminationReason === 'resignation') {
            // Employee resigned
            if ($yearsOfService < 2) {
                // Less than 2 years: No EOSB
                $eosb = 0;
            } elseif ($yearsOfService < 5) {
                // 2-5 years: 1/3 of salary per year
                $eosb = ($lastGrossSalary * $yearsOfService) / 3;
            } else {
                // 5+ years: 1/2 of salary per year
                $eosb = ($lastGrossSalary * $yearsOfService) / 2;
            }
        } elseif ($terminationReason === 'termination') {
            // Employer terminated (without cause)
            // Full EOSB: 1/2 salary per year for all years
            $eosb = ($lastGrossSalary * $yearsOfService) / 2;
        } elseif ($terminationReason === 'end_of_contract') {
            // Contract ended
            if ($yearsOfService >= 2) {
                $eosb = ($lastGrossSalary * $yearsOfService) / 2;
            }
        }

        // Notice period calculation (if applicable)
        // Typically 30 days for employees with 2+ years
        if ($yearsOfService >= 2 && $terminationReason === 'resignation') {
            $noticePeriod = $lastGrossSalary; // 1 month salary
        }

        $totalSettlement = $eosb + $unusedVacation + $noticePeriod;

        return [
            'years_of_service' => $yearsOfService,
            'months_of_service' => $monthsOfService,
            'days_of_service' => $daysOfService,
            'last_gross_salary' => $lastGrossSalary,
            'eosb_amount' => $eosb,
            'unused_vacation_amount' => $unusedVacation,
            'notice_period_amount' => $noticePeriod,
            'total_settlement' => $totalSettlement,
            'breakdown' => [
                'eosb' => $eosb,
                'unused_vacation' => $unusedVacation,
                'notice_period' => $noticePeriod
            ]
        ];
    }
}

