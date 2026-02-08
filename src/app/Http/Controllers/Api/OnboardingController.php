<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnboardingWorkflow;
use App\Models\OnboardingTask;
use App\Models\OnboardingDocument;
use App\Models\Employee;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class OnboardingController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = OnboardingWorkflow::with(['employee', 'tasks', 'documents']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('workflow_type')) {
            $query->where('workflow_type', $request->workflow_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'workflow_type' => 'required|in:onboarding,offboarding',
            'start_date' => 'required|date',
            'target_completion_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'not_started';
        $validated['completion_percentage'] = 0;

        $workflow = OnboardingWorkflow::create($validated);
        
        // Create default tasks based on workflow type
        $this->createDefaultTasks($workflow);
        
        return response()->json(array_merge(['success' => true], $workflow->load('employee', 'tasks')->toArray()), 201);
    }

    private function createDefaultTasks(OnboardingWorkflow $workflow)
    {
        $defaultTasks = [];
        
        if ($workflow->workflow_type === 'onboarding') {
            $defaultTasks = [
                ['task_name' => 'إنشاء معرف النظام', 'task_type' => 'system_id', 'department' => 'it', 'sequence_order' => 1],
                ['task_name' => 'تخصيص المعدات', 'task_type' => 'it_provisioning', 'department' => 'it', 'sequence_order' => 2],
                ['task_name' => 'إصدار بطاقة الدخول', 'task_type' => 'badge_access', 'department' => 'security', 'sequence_order' => 3],
                ['task_name' => 'استكمال المستندات', 'task_type' => 'document', 'department' => 'hr', 'sequence_order' => 4],
                ['task_name' => 'التدريب الأساسي', 'task_type' => 'training', 'department' => 'hr', 'sequence_order' => 5],
            ];
        } else {
            $defaultTasks = [
                ['task_name' => 'استرجاع المعدات', 'task_type' => 'it_provisioning', 'department' => 'it', 'sequence_order' => 1],
                ['task_name' => 'إلغاء بطاقة الدخول', 'task_type' => 'badge_access', 'department' => 'security', 'sequence_order' => 2],
                ['task_name' => 'إلغاء الوصول للنظام', 'task_type' => 'system_id', 'department' => 'it', 'sequence_order' => 3],
                ['task_name' => 'مقابلة الخروج', 'task_type' => 'other', 'department' => 'hr', 'sequence_order' => 4],
            ];
        }

        foreach ($defaultTasks as $task) {
            OnboardingTask::create([
                'workflow_id' => $workflow->id,
                'task_name' => $task['task_name'],
                'task_type' => $task['task_type'],
                'department' => $task['department'],
                'status' => 'pending',
                'sequence_order' => $task['sequence_order'],
            ]);
        }
    }

    public function show($id)
    {
        $workflow = OnboardingWorkflow::with(['employee', 'tasks', 'documents'])->findOrFail($id);
        return $this->successResponse($workflow->toArray());
    }

    public function updateTask(Request $request, $workflowId, $taskId)
    {
        $task = OnboardingTask::where('workflow_id', $workflowId)->findOrFail($taskId);
        
        $validated = $request->validate([
            'status' => 'in:pending,in_progress,completed,blocked',
            'notes' => 'nullable|string',
        ]);

        if ($request->status === 'completed' && !$task->completed_date) {
            $validated['completed_date'] = now();
            $validated['completed_by'] = auth()->id();
        }

        $task->update($validated);
        
        // Update workflow completion percentage
        $this->updateWorkflowProgress($workflowId);
        
        return $this->successResponse($task->toArray());
    }

    private function updateWorkflowProgress($workflowId)
    {
        $workflow = OnboardingWorkflow::findOrFail($workflowId);
        $totalTasks = $workflow->tasks()->count();
        $completedTasks = $workflow->tasks()->where('status', 'completed')->count();
        
        if ($totalTasks > 0) {
            $completionPercentage = round(($completedTasks / $totalTasks) * 100);
            $workflow->update([
                'completion_percentage' => $completionPercentage,
                'status' => $completionPercentage === 100 ? 'completed' : 'in_progress',
                'actual_completion_date' => $completionPercentage === 100 ? now() : null,
            ]);
        }
    }

    public function storeDocument(Request $request, $workflowId)
    {
        $validated = $request->validate([
            'document_name' => 'required|string|max:255',
            'document_type' => 'required|in:i9,w4,direct_deposit,nda,contract,policy,other',
            'file_path' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['workflow_id'] = $workflowId;
        $validated['status'] = 'pending';

        $document = OnboardingDocument::create($validated);
        return response()->json(array_merge(['success' => true], $document->toArray()), 201);
    }
}


