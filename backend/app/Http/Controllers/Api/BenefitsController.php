<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BenefitsPlan;
use App\Models\BenefitsEnrollment;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class BenefitsController extends Controller
{
    use BaseApiController;

    // Plans
    public function indexPlans(Request $request)
    {
        $query = BenefitsPlan::with(['enrollments']);
        
        if ($request->filled('plan_type')) {
            $query->where('plan_type', $request->plan_type);
        }
        
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === 'true');
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storePlan(Request $request)
    {
        $validated = $request->validate([
            'plan_code' => 'required|string|max:50|unique:benefits_plans,plan_code',
            'plan_name' => 'required|string|max:255',
            'plan_type' => 'required|in:health,dental,vision,life_insurance,disability,retirement,fsa,hsa,other',
            'description' => 'nullable|string',
            'eligibility_rule' => 'required|in:all,full_time,tenure,role,custom',
            'eligibility_criteria' => 'nullable|array',
            'employee_contribution' => 'nullable|numeric|min:0',
            'employer_contribution' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date|after:effective_date',
        ]);

        $validated['is_active'] = true;
        $validated['created_by'] = auth()->id();

        $plan = BenefitsPlan::create($validated);
        return response()->json(array_merge(['success' => true], $plan->toArray()), 201);
    }

    public function showPlan($id)
    {
        $plan = BenefitsPlan::with(['enrollments.employee'])->findOrFail($id);
        return $this->successResponse($plan->toArray());
    }

    public function updatePlan(Request $request, $id)
    {
        $plan = BenefitsPlan::findOrFail($id);
        
        $validated = $request->validate([
            'plan_name' => 'string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'expiry_date' => 'nullable|date',
        ]);

        $plan->update($validated);
        return $this->successResponse($plan->load('enrollments')->toArray());
    }

    // Enrollments
    public function indexEnrollments(Request $request)
    {
        $query = BenefitsEnrollment::with(['plan', 'employee']);
        
        if ($request->filled('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('enrollment_date', 'desc')->paginate(15)->toArray());
    }

    public function storeEnrollment(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:benefits_plans,id',
            'employee_id' => 'required|exists:employees,id',
            'enrollment_type' => 'required|in:open_enrollment,new_hire,life_event,qualifying_event',
            'effective_date' => 'required|date',
            'coverage_details' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $validated['enrollment_date'] = now();
        $validated['status'] = 'enrolled';

        $enrollment = BenefitsEnrollment::create($validated);
        return response()->json(array_merge(['success' => true], $enrollment->load('plan', 'employee')->toArray()), 201);
    }

    public function updateEnrollment(Request $request, $id)
    {
        $enrollment = BenefitsEnrollment::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:enrolled,active,terminated,cancelled',
            'termination_date' => 'nullable|date',
            'coverage_details' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $enrollment->update($validated);
        return $this->successResponse($enrollment->load('plan', 'employee')->toArray());
    }
}


