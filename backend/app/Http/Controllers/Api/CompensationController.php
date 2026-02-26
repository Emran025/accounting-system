<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompensationPlan;
use App\Models\CompensationEntry;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class CompensationController extends Controller
{
    use BaseApiController;

    public function indexPlans(Request $request)
    {
        $query = CompensationPlan::with(['entries.employee']);
        
        if ($request->filled('plan_type')) {
            $query->where('plan_type', $request->plan_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('fiscal_year')) {
            $query->where('fiscal_year', $request->fiscal_year);
        }
        
        return $this->successResponse($query->orderBy('effective_date', 'desc')->paginate(15)->toArray());
    }

    public function storePlan(Request $request)
    {
        $validated = $request->validate([
            'plan_name' => 'required|string|max:255',
            'plan_type' => 'required|in:merit,promotion,adjustment,bonus,commission',
            'fiscal_year' => 'required|string|max:10',
            'effective_date' => 'required|date',
            'budget_pool' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'draft';
        $validated['allocated_amount'] = 0;
        $validated['created_by'] = auth()->id();

        $plan = CompensationPlan::create($validated);
        return response()->json(array_merge(['success' => true], $plan->toArray()), 201);
    }

    public function showPlan($id)
    {
        $plan = CompensationPlan::with(['entries.employee'])->findOrFail($id);
        return $this->successResponse($plan->toArray());
    }

    public function updatePlan(Request $request, $id)
    {
        $plan = CompensationPlan::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:draft,pending_approval,approved,active,closed',
            'notes' => 'nullable|string',
        ]);

        if ($request->status === 'approved' && !$plan->approved_by) {
            $validated['approved_by'] = auth()->id();
        }

        $plan->update($validated);
        
        // Recalculate allocated amount
        $allocated = $plan->entries()->sum('increase_amount');
        $plan->update(['allocated_amount' => $allocated]);
        
        return $this->successResponse($plan->load('entries.employee')->toArray());
    }

    public function indexEntries(Request $request)
    {
        $query = CompensationEntry::with(['plan', 'employee']);
        
        if ($request->filled('compensation_plan_id')) {
            $query->where('compensation_plan_id', $request->compensation_plan_id);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeEntry(Request $request)
    {
        $validated = $request->validate([
            'compensation_plan_id' => 'required|exists:compensation_plans,id',
            'employee_id' => 'required|exists:employees,id',
            'current_salary' => 'required|numeric|min:0',
            'proposed_salary' => 'required|numeric|min:0',
            'comp_ratio' => 'nullable|numeric|min:0|max:2',
            'justification' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['increase_amount'] = $validated['proposed_salary'] - $validated['current_salary'];
        $validated['increase_percentage'] = $validated['current_salary'] > 0 
            ? round(($validated['increase_amount'] / $validated['current_salary']) * 100, 2)
            : 0;
        $validated['status'] = 'pending';

        $entry = CompensationEntry::create($validated);
        
        // Update plan allocated amount
        $plan = CompensationPlan::findOrFail($validated['compensation_plan_id']);
        $plan->update(['allocated_amount' => $plan->entries()->sum('increase_amount')]);
        
        return response()->json(array_merge(['success' => true], $entry->load('plan', 'employee')->toArray()), 201);
    }

    public function updateEntryStatus(Request $request, $id)
    {
        $entry = CompensationEntry::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected,processed',
        ]);

        if (in_array($request->status, ['approved', 'rejected'])) {
            $validated['approved_by'] = auth()->id();
        }

        $entry->update($validated);
        return $this->successResponse($entry->load('plan', 'employee')->toArray());
    }
}


