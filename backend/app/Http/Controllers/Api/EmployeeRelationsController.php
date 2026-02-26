<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeRelationsCase;
use App\Models\DisciplinaryAction;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class EmployeeRelationsController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = EmployeeRelationsCase::with(['employee', 'disciplinaryActions']);
        
        if ($request->filled('case_type')) {
            $query->where('case_type', $request->case_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        // Confidentiality filter - only show cases user has access to
        $user = auth()->user();
        if (!$user->hasRole('hr_manager') && !$user->hasRole('admin')) {
            $query->where('confidentiality_level', '!=', 'highly_confidential');
        }
        
        return $this->successResponse($query->orderBy('reported_date', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'case_type' => 'required|in:grievance,disciplinary,investigation,whistleblowing,complaint,other',
            'confidentiality_level' => 'required|in:public,confidential,highly_confidential',
            'description' => 'required|string',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $validated['case_number'] = 'CASE-' . date('Ymd') . '-' . str_pad(EmployeeRelationsCase::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'open';
        $validated['reported_date'] = now();
        $validated['reported_by'] = auth()->id();

        $case = EmployeeRelationsCase::create($validated);
        return response()->json(array_merge(['success' => true], $case->load('employee')->toArray()), 201);
    }

    public function show($id)
    {
        $case = EmployeeRelationsCase::with(['employee', 'disciplinaryActions'])->findOrFail($id);
        
        // Check confidentiality access
        $user = auth()->user();
        if ($case->confidentiality_level === 'highly_confidential' && 
            !$user->hasRole('hr_manager') && !$user->hasRole('admin')) {
            return $this->errorResponse('Access denied: Highly confidential case', 403);
        }
        
        return $this->successResponse($case->toArray());
    }

    public function update(Request $request, $id)
    {
        $case = EmployeeRelationsCase::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:open,under_investigation,hearing,resolved,closed,escalated',
            'resolution' => 'nullable|string',
            'resolved_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($request->status === 'resolved' && !$case->resolved_date) {
            $validated['resolved_date'] = now();
        }

        $case->update($validated);
        return $this->successResponse($case->load('employee', 'disciplinaryActions')->toArray());
    }

    public function storeDisciplinaryAction(Request $request, $caseId)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'action_type' => 'required|in:verbal_warning,written_warning,final_warning,suspension,termination,other',
            'violation_description' => 'required|string',
            'action_taken' => 'required|string',
            'action_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['case_id'] = $caseId;
        $validated['issued_by'] = auth()->id();

        $action = DisciplinaryAction::create($validated);
        return response()->json(array_merge(['success' => true], $action->load('employee', 'case')->toArray()), 201);
    }
}


