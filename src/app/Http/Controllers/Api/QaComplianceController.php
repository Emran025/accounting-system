<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QaCompliance;
use App\Models\Capa;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class QaComplianceController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = QaCompliance::with(['employee', 'capas']);
        
        if ($request->filled('compliance_type')) {
            $query->where('compliance_type', $request->compliance_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'compliance_type' => 'required|in:iso,soc,internal_audit,regulatory,other',
            'standard_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'employee_id' => 'nullable|exists:employees,id',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $validated['compliance_number'] = 'COMP-' . date('Ymd') . '-' . str_pad(QaCompliance::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'pending';

        $compliance = QaCompliance::create($validated);
        return response()->json(array_merge(['success' => true], $compliance->load('employee')->toArray()), 201);
    }

    public function show($id)
    {
        $compliance = QaCompliance::with(['employee', 'capas'])->findOrFail($id);
        return $this->successResponse($compliance->toArray());
    }

    public function update(Request $request, $id)
    {
        $compliance = QaCompliance::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:pending,in_progress,completed,non_compliant,cancelled',
            'findings' => 'nullable|string',
            'corrective_action' => 'nullable|string',
            'completed_date' => 'nullable|date',
        ]);

        if ($request->status === 'completed' && !$compliance->completed_date) {
            $validated['completed_date'] = now();
            $validated['completed_by'] = auth()->id();
        }

        $compliance->update($validated);
        return $this->successResponse($compliance->load('employee', 'capas')->toArray());
    }

    public function storeCapa(Request $request, $complianceId)
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'type' => 'required|in:corrective,preventive',
            'issue_description' => 'required|string',
            'root_cause' => 'nullable|string',
            'action_plan' => 'nullable|string',
            'target_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $validated['compliance_id'] = $complianceId;
        $validated['capa_number'] = 'CAPA-' . date('Ymd') . '-' . str_pad(Capa::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'open';

        $capa = Capa::create($validated);
        return response()->json(array_merge(['success' => true], $capa->load('compliance', 'employee')->toArray()), 201);
    }
}


