<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EhsIncident;
use App\Models\EmployeeHealthRecord;
use App\Models\PpeManagement;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class EhsController extends Controller
{
    use BaseApiController;

    // Incidents
    public function indexIncidents(Request $request)
    {
        $query = EhsIncident::with(['employee']);
        
        if ($request->filled('incident_type')) {
            $query->where('incident_type', $request->incident_type);
        }
        
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('incident_date', 'desc')->paginate(15)->toArray());
    }

    public function storeIncident(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'incident_type' => 'required|in:accident,near_miss,injury,illness,property_damage,environmental,other',
            'incident_date' => 'required|date',
            'incident_time' => 'nullable',
            'location' => 'nullable|string|max:255',
            'description' => 'required|string',
            'severity' => 'required|in:minor,moderate,serious,critical,fatal',
            'immediate_action_taken' => 'nullable|string',
            'osha_reportable' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['incident_number'] = 'INC-' . date('Ymd') . '-' . str_pad(EhsIncident::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'reported';
        $validated['reported_by'] = auth()->id();

        $incident = EhsIncident::create($validated);
        return response()->json(array_merge(['success' => true], $incident->load('employee')->toArray()), 201);
    }

    public function updateIncident(Request $request, $id)
    {
        $incident = EhsIncident::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:reported,under_investigation,resolved,closed',
            'root_cause' => 'nullable|string',
            'preventive_measures' => 'nullable|string',
            'investigated_by' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($request->status === 'under_investigation' && !$incident->investigated_by) {
            $validated['investigated_by'] = auth()->id();
        }

        $incident->update($validated);
        return $this->successResponse($incident->load('employee')->toArray());
    }

    // Health Records
    public function indexHealthRecords(Request $request)
    {
        $query = EmployeeHealthRecord::with(['employee']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('record_type')) {
            $query->where('record_type', $request->record_type);
        }
        
        return $this->successResponse($query->orderBy('record_date', 'desc')->paginate(15)->toArray());
    }

    public function storeHealthRecord(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'record_type' => 'required|in:vaccination,medical_exam,drug_test,health_screening,other',
            'record_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'provider_name' => 'nullable|string|max:255',
            'results' => 'nullable|string',
            'file_path' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $record = EmployeeHealthRecord::create($validated);
        return response()->json(array_merge(['success' => true], $record->load('employee')->toArray()), 201);
    }

    // PPE Management
    public function indexPpe(Request $request)
    {
        $query = PpeManagement::with(['employee']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('issue_date', 'desc')->paginate(15)->toArray());
    }

    public function storePpe(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'ppe_item' => 'required|string|max:255',
            'ppe_type' => 'required|in:helmet,safety_shoes,gloves,goggles,vest,mask,other',
            'issue_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'issued';

        $ppe = PpeManagement::create($validated);
        return response()->json(array_merge(['success' => true], $ppe->load('employee')->toArray()), 201);
    }
}


