<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TemplateService;
use App\Services\TemplateRegistry;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * System Template Controller
 * 
 * This controller enforces the exclusive use of system templates.
 * All template operations must go through the centralized TemplateService
 * which ensures compliance with the Report and Document Management Policy.
 */
class SystemTemplateController extends Controller
{
    use BaseApiController;

    protected TemplateService $templateService;
    protected TemplateRegistry $registry;

    public function __construct(TemplateService $templateService, TemplateRegistry $registry)
    {
        $this->templateService = $templateService;
        $this->registry = $registry;
    }

    protected function isSystemType(string $type): bool
    {
        $meta = TemplateRegistry::getTypeMetadata($type);
        return $meta && isset($meta['module']) && $meta['module'] !== 'hr';
    }

    protected function getSystemTypes(): array
    {
        $types = [];
        foreach (TemplateRegistry::getApprovedTypes() as $type => $meta) {
            if (isset($meta['module']) && $meta['module'] !== 'hr') {
                $types[] = $type;
            }
        }
        return $types;
    }

    /**
     * List all system templates.
     * Only returns templates from approved system types.
     */
    public function index(Request $request): JsonResponse
    {
        \Illuminate\Support\Facades\Log::info('SystemTemplateController@index hit');
        $approvedTypes = $this->getSystemTypes();
        \Illuminate\Support\Facades\Log::info('Checking templates for types: ' . implode(',', $approvedTypes));
        
        $query = \App\Models\DocumentTemplate::whereIn('template_type', $approvedTypes);
        \Illuminate\Support\Facades\Log::info('Template count before filters: ' . $query->count());

        if ($request->filled('type')) {
            // Validate type is approved
            if (!$this->isSystemType($request->type)) {
                return $this->errorResponse("Template type '{$request->type}' is not an approved system type", 400);
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
     * Store a new system template.
     * Validates template structure and keys before creation.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key'     => 'required|string|max:50|unique:document_templates,template_key',
            'template_name_ar' => 'required|string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'required|string',
            'body_html'        => 'required|string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
        ]);

        try {
            if (!$this->isSystemType($validated['template_type'])) {
                return $this->errorResponse("Template type '{$validated['template_type']}' is not an approved system type.", 403);
            }

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
     * Show a specific system template by its unique key.
     */
    public function showByKey($key): JsonResponse
    {
        try {
            $template = \App\Models\DocumentTemplate::where('template_key', $key)
                ->where('is_active', true)
                ->firstOrFail();
            
            // Ensure template is from approved system types
            if (!$this->isSystemType($template->template_type)) {
                return $this->errorResponse('Template is not a system template', 403);
            }
            
            return $this->successResponse($template->toArray());
        } catch (\Exception $e) {
            return $this->errorResponse('Template not found', 404);
        }
    }

    /**
     * Show the latest active template of a specific type.
     */
    public function showByType($type): JsonResponse
    {
        try {
            $template = $this->templateService->getTemplate($type);
            
            if (!$template) {
                return $this->errorResponse("No active template found for type '{$type}'", 404);
            }
            
            return $this->successResponse($template->toArray());
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Show a specific system template.
     */
    public function show($id): JsonResponse
    {
        try {
            $template = \App\Models\DocumentTemplate::findOrFail($id);
            
            // Ensure template is from approved system types
            if (!$this->isSystemType($template->template_type)) {
                return $this->errorResponse('Template is not a system template', 403);
            }
            
            return $this->successResponse($template->toArray());
        } catch (\Exception $e) {
            return $this->errorResponse('Template not found', 404);
        }
    }

    /**
     * Update a template and store its history.
     * Validates template structure before updating.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'template_name_ar' => 'string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'string',
            'body_html'        => 'string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
            'is_active'        => 'boolean',
        ]);

        try {
            $template = \App\Models\DocumentTemplate::findOrFail($id);
            if (!$this->isSystemType($template->template_type)) {
                return $this->errorResponse('Template is not a system template', 403);
            }

            if (isset($validated['template_type']) && !$this->isSystemType($validated['template_type'])) {
                return $this->errorResponse('Cannot change to a non-system template type', 403);
            }

            // If body_html is being updated, validate it
            if (isset($validated['body_html'])) {
                $type = $validated['template_type'] ?? $template->template_type;
                $validation = $this->templateService->validateTemplate($type, $validated['body_html']);
                if (!$validation['valid']) {
                    return $this->errorResponse('Template validation failed: ' . implode(', ', $validation['errors']), 422);
                }
            }

            $template = $this->templateService->updateTemplate($id, $validated);
            return $this->successResponse($template->toArray(), 'Template updated and history recorded');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Delete a template.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $template = \App\Models\DocumentTemplate::findOrFail($id);
            
            // Ensure template is from approved system types
            if (!$this->isSystemType($template->template_type)) {
                return $this->errorResponse('Template is not a system template', 403);
            }
            
            $this->templateService->deactivateTemplate($id);
            return $this->successResponse([], 'Template deactivated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * View history log of a template
     */
    public function history($id): JsonResponse
    {
        try {
            $histories = $this->templateService->getTemplateHistory($id);
            return $this->successResponse($histories->toArray(), 'Template history fetched');
        } catch (\Exception $e) {
            return $this->errorResponse('Template not found', 404);
        }
    }

    /**
     * Render a template with provided context data.
     * This endpoint allows modules to render templates with their data.
     */
    public function render(Request $request, $id): JsonResponse
    {
        $request->validate([
            'context'   => 'required|array',
            'language'  => 'nullable|string|in:ar,en',
        ]);

        try {
            $renderedHtml = $this->templateService->renderTemplate(
                $id,
                $request->context,
                $request->language ?? 'ar'
            );

            return $this->successResponse([
                'rendered_html' => $renderedHtml,
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
            if (!$this->isSystemType($request->type)) {
                return $this->errorResponse("Template type '{$request->type}' is not an approved system type", 400);
            }

            $keys = $this->templateService->getApprovedKeysForType($request->type);
            return $this->successResponse($keys, 'Approved keys fetched');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}
