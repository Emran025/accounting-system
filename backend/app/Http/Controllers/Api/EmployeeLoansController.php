<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeLoan;
use App\Models\LoanRepayment;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class EmployeeLoansController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = EmployeeLoan::with(['employee', 'repayments']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('loan_type')) {
            $query->where('loan_type', $request->loan_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'loan_type' => 'required|in:salary_advance,housing,car,personal,other',
            'loan_amount' => 'required|numeric|min:0',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
            'installment_count' => 'required|integer|min:1',
            'start_date' => 'required|date',
            'auto_deduction' => 'boolean',
            'deduction_component_id' => 'nullable|exists:payroll_components,id',
            'notes' => 'nullable|string',
        ]);

        // Calculate monthly installment
        $principal = $validated['loan_amount'];
        $interestRate = ($validated['interest_rate'] ?? 0) / 100 / 12; // Monthly interest rate
        $installments = $validated['installment_count'];

        if ($interestRate > 0) {
            $monthlyInstallment = $principal * ($interestRate * pow(1 + $interestRate, $installments)) / (pow(1 + $interestRate, $installments) - 1);
        } else {
            $monthlyInstallment = $principal / $installments;
        }

        $validated['loan_number'] = 'LOAN-' . date('Ymd') . '-' . str_pad(EmployeeLoan::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['monthly_installment'] = round($monthlyInstallment, 2);
        $validated['remaining_balance'] = $validated['loan_amount'];
        $validated['status'] = 'pending';
        $validated['end_date'] = \Carbon\Carbon::parse($validated['start_date'])->addMonths($installments)->format('Y-m-d');

        $loan = EmployeeLoan::create($validated);
        
        // Create repayment schedule
        $this->createRepaymentSchedule($loan);
        
        return response()->json(array_merge(['success' => true], $loan->load('employee', 'repayments')->toArray()), 201);
    }

    private function createRepaymentSchedule(EmployeeLoan $loan)
    {
        $startDate = \Carbon\Carbon::parse($loan->start_date);
        $monthlyInstallment = $loan->monthly_installment;
        $remainingBalance = $loan->loan_amount;
        $interestRate = $loan->interest_rate / 100 / 12;

        for ($i = 1; $i <= $loan->installment_count; $i++) {
            $dueDate = $startDate->copy()->addMonths($i);
            
            if ($interestRate > 0) {
                $interest = $remainingBalance * $interestRate;
                $principal = $monthlyInstallment - $interest;
            } else {
                $interest = 0;
                $principal = $monthlyInstallment;
            }

            LoanRepayment::create([
                'loan_id' => $loan->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'amount' => $monthlyInstallment,
                'principal' => round($principal, 2),
                'interest' => round($interest, 2),
                'status' => 'pending',
            ]);

            $remainingBalance -= $principal;
        }
    }

    public function show($id)
    {
        $loan = EmployeeLoan::with(['employee', 'repayments'])->findOrFail($id);
        return $this->successResponse($loan->toArray());
    }

    public function updateStatus(Request $request, $id)
    {
        $loan = EmployeeLoan::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,active,completed,cancelled,defaulted',
        ]);

        if ($request->status === 'approved') {
            $validated['approved_by'] = auth()->id();
            $validated['status'] = 'active';
        }

        $loan->update($validated);
        return $this->successResponse($loan->load('employee', 'repayments')->toArray());
    }

    public function recordRepayment(Request $request, $id, $repaymentId)
    {
        $repayment = LoanRepayment::where('loan_id', $id)->findOrFail($repaymentId);
        
        $validated = $request->validate([
            'paid_date' => 'required|date',
            'payroll_cycle_id' => 'nullable|exists:payroll_cycles,id',
        ]);

        $validated['status'] = 'paid';
        $repayment->update($validated);
        
        // Update loan remaining balance
        $loan = EmployeeLoan::findOrFail($id);
        $paidAmount = $repayment->principal;
        $loan->remaining_balance -= $paidAmount;
        
        if ($loan->remaining_balance <= 0) {
            $loan->status = 'completed';
        }
        $loan->save();
        
        return $this->successResponse($repayment->load('loan')->toArray());
    }
}


