<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerformanceGoal;
use App\Models\PerformanceAppraisal;
use App\Models\ContinuousFeedback;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class PerformanceController extends Controller
{
    use BaseApiController;

    // Goals
    public function indexGoals(Request $request)
    {
        $query = PerformanceGoal::with(['employee', 'parentGoal']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('goal_type')) {
            $query->where('goal_type', $request->goal_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('target_date', 'desc')->paginate(15)->toArray());
    }

    public function storeGoal(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'goal_title' => 'required|string|max:255',
            'goal_description' => 'required|string',
            'goal_type' => 'required|in:okr,kpi,personal,team,corporate',
            'parent_goal_id' => 'nullable|exists:performance_goals,id',
            'target_value' => 'nullable|numeric',
            'current_value' => 'nullable|numeric',
            'unit' => 'nullable|string|max:50',
            'start_date' => 'required|date',
            'target_date' => 'required|date|after:start_date',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'not_started';
        $validated['progress_percentage'] = 0;
        $validated['current_value'] = $validated['current_value'] ?? 0;
        $validated['created_by'] = auth()->id();

        $goal = PerformanceGoal::create($validated);
        return response()->json(array_merge(['success' => true], $goal->load('employee', 'parentGoal')->toArray()), 201);
    }

    public function updateGoal(Request $request, $id)
    {
        $goal = PerformanceGoal::findOrFail($id);
        
        $validated = $request->validate([
            'goal_title' => 'string|max:255',
            'goal_description' => 'string',
            'status' => 'in:not_started,in_progress,on_track,at_risk,completed,cancelled',
            'target_value' => 'nullable|numeric',
            'current_value' => 'nullable|numeric',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        // Auto-calculate progress if current and target values provided
        if (isset($validated['current_value']) && isset($validated['target_value']) && $validated['target_value'] > 0) {
            $validated['progress_percentage'] = min(100, round(($validated['current_value'] / $validated['target_value']) * 100));
        }

        if ($request->status === 'completed' && !$goal->completed_date) {
            $validated['completed_date'] = now();
            $validated['progress_percentage'] = 100;
        }

        $goal->update($validated);
        return $this->successResponse($goal->load('employee', 'parentGoal')->toArray());
    }

    // Appraisals
    public function indexAppraisals(Request $request)
    {
        $query = PerformanceAppraisal::with(['employee']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('appraisal_type')) {
            $query->where('appraisal_type', $request->appraisal_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('appraisal_date', 'desc')->paginate(15)->toArray());
    }

    public function storeAppraisal(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'appraisal_type' => 'required|in:self,manager,peer,360,annual,mid_year',
            'appraisal_period' => 'required|string|max:50',
            'appraisal_date' => 'required|date',
            'manager_id' => 'nullable|exists:employees,id',
            'ratings' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $validated['appraisal_number'] = 'APP-' . date('Ymd') . '-' . str_pad(PerformanceAppraisal::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'draft';
        $validated['ratings'] = $validated['ratings'] ?? [];

        $appraisal = PerformanceAppraisal::create($validated);
        return response()->json(array_merge(['success' => true], $appraisal->load('employee')->toArray()), 201);
    }

    public function updateAppraisal(Request $request, $id)
    {
        $appraisal = PerformanceAppraisal::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:draft,self_review,manager_review,calibration,completed,cancelled',
            'ratings' => 'nullable|array',
            'self_assessment' => 'nullable|string',
            'manager_feedback' => 'nullable|string',
            'peer_feedback' => 'nullable|string',
            'overall_rating' => 'nullable|numeric|min:1|max:5',
            'notes' => 'nullable|string',
        ]);

        $appraisal->update($validated);
        return $this->successResponse($appraisal->load('employee')->toArray());
    }

    // Continuous Feedback
    public function indexFeedback(Request $request)
    {
        $query = ContinuousFeedback::with(['employee', 'givenBy']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('feedback_type')) {
            $query->where('feedback_type', $request->feedback_type);
        }
        
        return $this->successResponse($query->orderBy('feedback_date', 'desc')->paginate(15)->toArray());
    }

    public function storeFeedback(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'feedback_type' => 'required|in:check_in,praise,improvement,coaching,other',
            'feedback_content' => 'required|string',
            'feedback_date' => 'required|date',
            'is_visible_to_employee' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['given_by'] = auth()->id();

        $feedback = ContinuousFeedback::create($validated);
        return response()->json(array_merge(['success' => true], $feedback->load('employee', 'givenBy')->toArray()), 201);
    }
}


