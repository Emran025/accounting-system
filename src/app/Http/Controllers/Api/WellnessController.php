<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WellnessProgram;
use App\Models\WellnessParticipation;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class WellnessController extends Controller
{
    use BaseApiController;

    public function indexPrograms(Request $request)
    {
        $query = WellnessProgram::with(['participations']);
        
        if ($request->filled('program_type')) {
            $query->where('program_type', $request->program_type);
        }
        
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === 'true');
        }
        
        return $this->successResponse($query->orderBy('start_date', 'desc')->paginate(15)->toArray());
    }

    public function storeProgram(Request $request)
    {
        $validated = $request->validate([
            'program_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'program_type' => 'required|in:steps_challenge,health_challenge,fitness,nutrition,mental_health,other',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'target_metrics' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $validated['is_active'] = true;
        $validated['created_by'] = auth()->id();

        $program = WellnessProgram::create($validated);
        return response()->json(array_merge(['success' => true], $program->toArray()), 201);
    }

    public function indexParticipations(Request $request)
    {
        $query = WellnessParticipation::with(['program', 'employee']);
        
        if ($request->filled('program_id')) {
            $query->where('program_id', $request->program_id);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        return $this->successResponse($query->orderBy('enrollment_date', 'desc')->paginate(15)->toArray());
    }

    public function storeParticipation(Request $request)
    {
        $validated = $request->validate([
            'program_id' => 'required|exists:wellness_programs,id',
            'employee_id' => 'required|exists:employees,id',
            'notes' => 'nullable|string',
        ]);

        $validated['enrollment_date'] = now();
        $validated['status'] = 'enrolled';
        $validated['points'] = 0;
        $validated['metrics_data'] = [];

        $participation = WellnessParticipation::create($validated);
        return response()->json(array_merge(['success' => true], $participation->load('program', 'employee')->toArray()), 201);
    }

    public function updateParticipation(Request $request, $id)
    {
        $participation = WellnessParticipation::findOrFail($id);
        
        $validated = $request->validate([
            'metrics_data' => 'nullable|array',
            'points' => 'nullable|integer|min:0',
            'status' => 'in:enrolled,active,completed,dropped',
            'notes' => 'nullable|string',
        ]);

        $participation->update($validated);
        return $this->successResponse($participation->load('program', 'employee')->toArray());
    }
}


