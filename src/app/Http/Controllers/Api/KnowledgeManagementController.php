<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBase;
use App\Models\ExpertiseDirectory;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class KnowledgeManagementController extends Controller
{
    use BaseApiController;

    // Knowledge Base
    public function indexKnowledgeBase(Request $request)
    {
        $query = KnowledgeBase::query();
        
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        
        if ($request->filled('is_published')) {
            $query->where('is_published', $request->is_published === 'true');
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%");
            });
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeKnowledgeBase(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'required|in:policy,procedure,best_practice,faq,training,other',
            'tags' => 'nullable|array',
            'file_path' => 'nullable|string',
            'is_published' => 'boolean',
        ]);

        $validated['view_count'] = 0;
        $validated['helpful_count'] = 0;
        $validated['created_by'] = auth()->id();
        $validated['is_published'] = $validated['is_published'] ?? false;

        $kb = KnowledgeBase::create($validated);
        return response()->json(array_merge(['success' => true], $kb->toArray()), 201);
    }

    public function showKnowledgeBase($id)
    {
        $kb = KnowledgeBase::findOrFail($id);
        
        // Increment view count
        $kb->increment('view_count');
        
        return $this->successResponse($kb->toArray());
    }

    public function updateKnowledgeBase(Request $request, $id)
    {
        $kb = KnowledgeBase::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'string|max:255',
            'content' => 'string',
            'is_published' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        $kb->update($validated);
        return $this->successResponse($kb->toArray());
    }

    public function markHelpful(Request $request, $id)
    {
        $kb = KnowledgeBase::findOrFail($id);
        $kb->increment('helpful_count');
        return $this->successResponse($kb->toArray());
    }

    // Expertise Directory
    public function indexExpertise(Request $request)
    {
        $query = ExpertiseDirectory::with(['employee']);
        
        if ($request->filled('skill_name')) {
            $query->where('skill_name', 'like', "%{$request->skill_name}%");
        }
        
        if ($request->filled('proficiency_level')) {
            $query->where('proficiency_level', $request->proficiency_level);
        }
        
        if ($request->filled('is_available_for_projects')) {
            $query->where('is_available_for_projects', $request->is_available_for_projects === 'true');
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeExpertise(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'skill_name' => 'required|string|max:255',
            'proficiency_level' => 'required|in:beginner,intermediate,advanced,expert',
            'years_of_experience' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'certifications' => 'nullable|array',
            'projects' => 'nullable|array',
            'is_available_for_projects' => 'boolean',
        ]);

        $validated['is_available_for_projects'] = $validated['is_available_for_projects'] ?? true;

        $expertise = ExpertiseDirectory::create($validated);
        return response()->json(array_merge(['success' => true], $expertise->load('employee')->toArray()), 201);
    }

    public function updateExpertise(Request $request, $id)
    {
        $expertise = ExpertiseDirectory::findOrFail($id);
        
        $validated = $request->validate([
            'skill_name' => 'string|max:255',
            'proficiency_level' => 'in:beginner,intermediate,advanced,expert',
            'years_of_experience' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'is_available_for_projects' => 'boolean',
        ]);

        $expertise->update($validated);
        return $this->successResponse($expertise->load('employee')->toArray());
    }
}


