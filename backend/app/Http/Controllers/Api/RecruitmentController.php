<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecruitmentRequisition;
use App\Models\JobApplicant;
use App\Models\Interview;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class RecruitmentController extends Controller
{
    use BaseApiController;

    // Requisitions
    public function indexRequisitions(Request $request)
    {
        $query = RecruitmentRequisition::with(['department', 'role']);
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeRequisition(Request $request)
    {
        $validated = $request->validate([
            'job_title' => 'required|string|max:255',
            'job_description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'role_id' => 'nullable|exists:roles,id',
            'number_of_positions' => 'required|integer|min:1',
            'employment_type' => 'required|in:full_time,part_time,contract,temporary',
            'budgeted_salary_min' => 'nullable|numeric|min:0',
            'budgeted_salary_max' => 'nullable|numeric|min:0',
            'target_start_date' => 'nullable|date',
            'required_qualifications' => 'nullable|string',
            'preferred_qualifications' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['requisition_number'] = 'REQ-' . date('Ymd') . '-' . str_pad(RecruitmentRequisition::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'draft';
        $validated['requested_by'] = auth()->id();
        $validated['is_published'] = false;

        $requisition = RecruitmentRequisition::create($validated);
        return response()->json(array_merge(['success' => true], $requisition->load('department', 'role')->toArray()), 201);
    }

    public function showRequisition($id)
    {
        $requisition = RecruitmentRequisition::with(['department', 'role', 'applicants'])->findOrFail($id);
        return $this->successResponse($requisition->toArray());
    }

    public function updateRequisition(Request $request, $id)
    {
        $requisition = RecruitmentRequisition::findOrFail($id);
        
        $validated = $request->validate([
            'job_title' => 'string|max:255',
            'job_description' => 'nullable|string',
            'status' => 'in:draft,pending_approval,approved,rejected,closed,filled',
            'is_published' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        if ($request->filled('approved_by') && $request->status === 'approved') {
            $validated['approved_by'] = auth()->id();
            $validated['approved_at'] = now();
        }

        $requisition->update($validated);
        return $this->successResponse($requisition->load('department', 'role')->toArray());
    }

    // Applicants
    public function indexApplicants(Request $request)
    {
        $query = JobApplicant::with(['requisition']);
        
        if ($request->filled('requisition_id')) {
            $query->where('requisition_id', $request->requisition_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('application_date', 'desc')->paginate(15)->toArray());
    }

    public function storeApplicant(Request $request)
    {
        $validated = $request->validate([
            'requisition_id' => 'required|exists:recruitment_requisitions,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:20',
            'resume_path' => 'nullable|string',
            'cover_letter_path' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['application_date'] = now();
        $validated['status'] = 'applied';

        $applicant = JobApplicant::create($validated);
        return response()->json(array_merge(['success' => true], $applicant->load('requisition')->toArray()), 201);
    }

    public function updateApplicantStatus(Request $request, $id)
    {
        $applicant = JobApplicant::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:applied,screened,assessment,interview,offer,hired,rejected,withdrawn',
            'screening_notes' => 'nullable|string',
            'interview_notes' => 'nullable|string',
        ]);

        if ($request->status === 'screened') {
            $validated['screened_by'] = auth()->id();
        }
        
        if ($request->status === 'interview') {
            $validated['interviewed_by'] = auth()->id();
        }

        $applicant->update($validated);
        return $this->successResponse($applicant->load('requisition')->toArray());
    }

    // Interviews
    public function storeInterview(Request $request)
    {
        $validated = $request->validate([
            'applicant_id' => 'required|exists:job_applicants,id',
            'interviewer_id' => 'required|exists:users,id',
            'interview_type' => 'required|in:phone,video,in_person,panel',
            'scheduled_at' => 'required|date',
            'location' => 'nullable|string|max:255',
            'meeting_link' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'scheduled';

        $interview = Interview::create($validated);
        return response()->json(array_merge(['success' => true], $interview->load('applicant', 'interviewer')->toArray()), 201);
    }

    public function updateInterview(Request $request, $id)
    {
        $interview = Interview::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:scheduled,completed,cancelled,no_show',
            'rating' => 'nullable|integer|min:1|max:5',
            'feedback' => 'nullable|string',
            'completed_at' => 'nullable|date',
        ]);

        if ($request->status === 'completed' && !$interview->completed_at) {
            $validated['completed_at'] = now();
        }

        $interview->update($validated);
        return $this->successResponse($interview->load('applicant', 'interviewer')->toArray());
    }
}


