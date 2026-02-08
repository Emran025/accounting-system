<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Models\LearningEnrollment;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class LearningController extends Controller
{
    use BaseApiController;

    // Courses
    public function indexCourses(Request $request)
    {
        $query = LearningCourse::with(['enrollments']);
        
        if ($request->filled('course_type')) {
            $query->where('course_type', $request->course_type);
        }
        
        if ($request->filled('delivery_method')) {
            $query->where('delivery_method', $request->delivery_method);
        }
        
        if ($request->filled('is_published')) {
            $query->where('is_published', $request->is_published === 'true');
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeCourse(Request $request)
    {
        $validated = $request->validate([
            'course_code' => 'required|string|max:50|unique:learning_courses,course_code',
            'course_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'delivery_method' => 'required|in:in_person,virtual,elearning,blended',
            'course_type' => 'required|in:mandatory,optional,compliance,development',
            'duration_hours' => 'nullable|integer|min:0',
            'scorm_path' => 'nullable|string',
            'video_url' => 'nullable|url',
            'is_recurring' => 'boolean',
            'recurrence_months' => 'nullable|integer|min:1',
            'requires_assessment' => 'boolean',
            'passing_score' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['is_published'] = false;
        $validated['created_by'] = auth()->id();

        $course = LearningCourse::create($validated);
        return response()->json(array_merge(['success' => true], $course->toArray()), 201);
    }

    public function showCourse($id)
    {
        $course = LearningCourse::with(['enrollments.employee'])->findOrFail($id);
        return $this->successResponse($course->toArray());
    }

    public function updateCourse(Request $request, $id)
    {
        $course = LearningCourse::findOrFail($id);
        
        $validated = $request->validate([
            'course_name' => 'string|max:255',
            'description' => 'nullable|string',
            'is_published' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $course->update($validated);
        return $this->successResponse($course->load('enrollments')->toArray());
    }

    // Enrollments
    public function indexEnrollments(Request $request)
    {
        $query = LearningEnrollment::with(['course', 'employee']);
        
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
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
            'course_id' => 'required|exists:learning_courses,id',
            'employee_id' => 'required|exists:employees,id',
            'enrollment_type' => 'required|in:assigned,self_enrolled,mandatory',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['enrollment_date'] = now();
        $validated['status'] = 'enrolled';
        $validated['progress_percentage'] = 0;
        
        if ($validated['enrollment_type'] === 'assigned' || $validated['enrollment_type'] === 'mandatory') {
            $validated['assigned_by'] = auth()->id();
        }

        $enrollment = LearningEnrollment::create($validated);
        return response()->json(array_merge(['success' => true], $enrollment->load('course', 'employee')->toArray()), 201);
    }

    public function updateEnrollment(Request $request, $id)
    {
        $enrollment = LearningEnrollment::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'in:enrolled,in_progress,completed,failed,dropped',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'score' => 'nullable|integer|min:0|max:100',
            'completion_date' => 'nullable|date',
        ]);

        if ($request->status === 'completed' && !$enrollment->completion_date) {
            $validated['completion_date'] = now();
            $validated['progress_percentage'] = 100;
            
            // Check if passed
            $course = $enrollment->course;
            if ($course->requires_assessment && isset($validated['score'])) {
                $validated['is_passed'] = $validated['score'] >= ($course->passing_score ?? 0);
            } else {
                $validated['is_passed'] = true;
            }
        }

        $enrollment->update($validated);
        return $this->successResponse($enrollment->load('course', 'employee')->toArray());
    }
}


