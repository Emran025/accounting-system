<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TemplateService;
use App\Services\TemplateRegistry;
use App\Services\EmployeeContextBuilder;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\DocumentTemplate;

/**
 * HR Document Template Controller
 * 
 * This controller enforces the exclusive use of system templates for HR documents.
 * All HR template operations must go through the centralized TemplateService
 * which ensures compliance with the Report and Document Management Policy.
 */
class DocumentTemplateController extends Controller
{
    use BaseApiController;

    protected TemplateService $templateService;
    protected TemplateRegistry $registry;

    // HR-specific approved template types
    protected array $hrTypes = [
        'contract', 'clearance', 'warning', 'id_card', 
        'handover', 'certificate', 'memo', 'other',
        'employee_certificate', 'employee_contract'
    ];

    public function __construct(TemplateService $templateService, TemplateRegistry $registry)
    {
        $this->templateService = $templateService;
        $this->registry = $registry;
    }

    /**
     * List all active HR document templates.
     * Only returns templates from approved HR types.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DocumentTemplate::whereIn('template_type', $this->hrTypes);

        if ($request->filled('type')) {
            // Validate type is approved
            if (!in_array($request->type, $this->hrTypes) || !$this->registry->isApprovedType($request->type)) {
                return $this->errorResponse("Template type '{$request->type}' is not an approved HR template type", 400);
            }
            $query->where('template_type', $request->type);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('template_name_ar', 'like', "%{$request->search}%")
                  ->orWhere('template_name_en', 'like', "%{$request->search}%")
                  ->orWhere('template_key', 'like', "%{$request->search}%");
            });
        }

        $templates = $query->where('is_active', true)
            ->orderBy('template_type')
            ->orderBy('template_name_ar')
            ->get();
            
        return $this->successResponse($templates->toArray());
    }

    /**
     * Store a new HR document template.
     * Validates template structure and keys before creation.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key'     => 'required|string|max:50|unique:document_templates,template_key',
            'template_name_ar' => 'required|string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'required|string|in:' . implode(',', $this->hrTypes),
            'body_html'        => 'required|string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
        ]);

        try {
            // Validate template using centralized service
            $validation = $this->templateService->validateTemplate($validated['template_type'], $validated['body_html']);
            if (!$validation['valid']) {
                return $this->errorResponse('Template validation failed: ' . implode(', ', $validation['errors']), 422);
            }

            $template = $this->templateService->createTemplate($validated);
            return $this->successResponse($template->toArray(), 'Template created successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Show a specific HR document template.
     */
    public function show($id): JsonResponse
    {
        try {
            $template = DocumentTemplate::findOrFail($id);
            
            // Ensure template is from approved HR types
            if (!in_array($template->template_type, $this->hrTypes) || !$this->registry->isApprovedType($template->template_type)) {
                return $this->errorResponse('Template is not an approved HR template', 403);
            }
            
            return $this->successResponse($template->toArray());
        } catch (\Exception $e) {
            return $this->errorResponse('Template not found', 404);
        }
    }

    /**
     * Update an existing HR template.
     * Validates template structure before updating.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'template_name_ar' => 'string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'string|in:' . implode(',', $this->hrTypes),
            'body_html'        => 'string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
            'is_active'        => 'boolean',
        ]);

        try {
            // If body_html is being updated, validate it
            if (isset($validated['body_html'])) {
                $type = $validated['template_type'] ?? DocumentTemplate::findOrFail($id)->template_type;
                $validation = $this->templateService->validateTemplate($type, $validated['body_html']);
                if (!$validation['valid']) {
                    return $this->errorResponse('Template validation failed: ' . implode(', ', $validation['errors']), 422);
                }
            }

            $template = $this->templateService->updateTemplate($id, $validated);
            return $this->successResponse($template->toArray(), 'Template updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Soft-delete / deactivate a template.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $template = DocumentTemplate::findOrFail($id);
            
            // Ensure template is from approved HR types
            if (!in_array($template->template_type, $this->hrTypes) || !$this->registry->isApprovedType($template->template_type)) {
                return $this->errorResponse('Template is not an approved HR template', 403);
            }
            
            $this->templateService->deactivateTemplate($id);
            return $this->successResponse([], 'Template deactivated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Render a template with employee data for preview/print.
     * 
     * Uses the centralized TemplateService and EmployeeContextBuilder
     * to ensure consistent rendering across all HR documents.
     */
    public function render(Request $request, $id): JsonResponse
    {
        $request->validate([
            'employee_id'   => 'required|exists:employees,id',
            'custom_fields' => 'nullable|array',
            'language'      => 'nullable|string|in:ar,en',
        ]);

        try {
            // Load template
            $template = DocumentTemplate::findOrFail($id);
            
            // Ensure template is from approved HR types
            if (!in_array($template->template_type, $this->hrTypes) || !$this->registry->isApprovedType($template->template_type)) {
                return $this->errorResponse('Template is not an approved HR template', 403);
            }

            // Load employee with relationships
            $employee = Employee::with(['role', 'department', 'currentContract'])->findOrFail($request->employee_id);

            // Build context using EmployeeContextBuilder
            $context = EmployeeContextBuilder::build($employee, $request->custom_fields ?? []);

            // Render using centralized TemplateService
            $renderedHtml = $this->templateService->renderTemplate(
                $template->id,
                $context,
                $request->language ?? 'ar'
            );

            return $this->successResponse([
                'rendered_html' => $renderedHtml,
                'template'      => $template->toArray(),
                'employee'      => $employee->toArray(),
            ], 'Template rendered successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get approved keys for a template type.
     * Useful for template editors to show available placeholders.
     */
    public function getApprovedKeys(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|string',
        ]);

        try {
            if (!in_array($request->type, $this->hrTypes) || !$this->registry->isApprovedType($request->type)) {
                return $this->errorResponse("Template type '{$request->type}' is not an approved HR template type", 400);
            }

            $keys = $this->templateService->getApprovedKeysForType($request->type);
            return $this->successResponse($keys, 'Approved keys fetched');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}
