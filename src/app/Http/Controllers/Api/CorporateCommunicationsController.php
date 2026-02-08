<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CorporateAnnouncement;
use App\Models\PulseSurvey;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class CorporateCommunicationsController extends Controller
{
    use BaseApiController;

    // Announcements
    public function indexAnnouncements(Request $request)
    {
        $query = CorporateAnnouncement::query();
        
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        
        if ($request->filled('is_published')) {
            $query->where('is_published', $request->is_published === 'true');
        }
        
        $user = auth()->user();
        
        // Filter by target audience
        if (!$request->filled('all')) {
            // Apply target audience filtering based on user's department, role, etc.
            // This is simplified - you'd implement full logic based on target_audience field
        }
        
        return $this->successResponse($query->orderBy('publish_date', 'desc')->paginate(15)->toArray());
    }

    public function storeAnnouncement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'priority' => 'required|in:low,normal,high,urgent',
            'target_audience' => 'required|in:all,department,role,location,custom',
            'target_departments' => 'nullable|array',
            'target_roles' => 'nullable|array',
            'target_locations' => 'nullable|array',
            'target_employees' => 'nullable|array',
            'publish_date' => 'required|date',
            'expiry_date' => 'nullable|date|after:publish_date',
            'is_published' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['is_published'] = $validated['is_published'] ?? false;

        $announcement = CorporateAnnouncement::create($validated);
        return response()->json(array_merge(['success' => true], $announcement->toArray()), 201);
    }

    public function updateAnnouncement(Request $request, $id)
    {
        $announcement = CorporateAnnouncement::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'string|max:255',
            'content' => 'string',
            'is_published' => 'boolean',
            'expiry_date' => 'nullable|date',
        ]);

        $announcement->update($validated);
        return $this->successResponse($announcement->toArray());
    }

    // Pulse Surveys
    public function indexSurveys(Request $request)
    {
        $query = PulseSurvey::with(['responses']);
        
        if ($request->filled('survey_type')) {
            $query->where('survey_type', $request->survey_type);
        }
        
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === 'true');
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeSurvey(Request $request)
    {
        $validated = $request->validate([
            'survey_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'survey_type' => 'required|in:sentiment,burnout,engagement,custom',
            'questions' => 'required|array',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_anonymous' => 'boolean',
            'target_audience' => 'required|in:all,department,role,location',
            'target_departments' => 'nullable|array',
            'target_roles' => 'nullable|array',
        ]);

        $validated['is_active'] = true;
        $validated['created_by'] = auth()->id();

        $survey = PulseSurvey::create($validated);
        return response()->json(array_merge(['success' => true], $survey->toArray()), 201);
    }

    public function storeSurveyResponse(Request $request, $surveyId)
    {
        $survey = PulseSurvey::findOrFail($surveyId);
        
        $validated = $request->validate([
            'responses' => 'required|array',
        ]);

        $validated['survey_id'] = $surveyId;
        $validated['employee_id'] = $survey->is_anonymous ? null : auth()->id();
        $validated['submitted_at'] = now();

        $response = SurveyResponse::create($validated);
        return response()->json(array_merge(['success' => true], $response->toArray()), 201);
    }
}


