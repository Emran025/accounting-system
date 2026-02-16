<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentTemplateController extends Controller
{
    use BaseApiController;

    /**
     * List all active document templates, with optional type & search filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DocumentTemplate::query();

        if ($request->filled('type')) {
            $query->where('template_type', $request->type);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('template_name_ar', 'like', "%{$request->search}%")
                  ->orWhere('template_name_en', 'like', "%{$request->search}%")
                  ->orWhere('template_key', 'like', "%{$request->search}%");
            });
        }

        $templates = $query->where('is_active', true)->orderBy('template_type')->orderBy('template_name_ar')->get();
        return $this->successResponse($templates->toArray());
    }

    /**
     * Store a new document template.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key'     => 'required|string|max:50|unique:document_templates,template_key',
            'template_name_ar' => 'required|string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'required|in:contract,clearance,warning,id_card,handover,certificate,memo,other',
            'body_html'        => 'required|string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = auth()->id();
        $template = DocumentTemplate::create($validated);

        return $this->successResponse($template->toArray(), 'Template created');
    }

    /**
     * Show a specific document template.
     */
    public function show($id): JsonResponse
    {
        $template = DocumentTemplate::findOrFail($id);
        return $this->successResponse($template->toArray());
    }

    /**
     * Update an existing template.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $template = DocumentTemplate::findOrFail($id);

        $validated = $request->validate([
            'template_name_ar' => 'string|max:255',
            'template_name_en' => 'nullable|string|max:255',
            'template_type'    => 'in:contract,clearance,warning,id_card,handover,certificate,memo,other',
            'body_html'        => 'string',
            'editable_fields'  => 'nullable|array',
            'description'      => 'nullable|string|max:500',
            'is_active'        => 'boolean',
        ]);

        $template->update($validated);
        return $this->successResponse($template->toArray(), 'Template updated');
    }

    /**
     * Soft-delete / remove a template.
     */
    public function destroy($id): JsonResponse
    {
        $template = DocumentTemplate::findOrFail($id);
        $template->delete();
        return $this->successResponse([], 'Template deleted');
    }

    /**
     * Render a template with employee data for preview/print.
     *
     * Replaces all {{placeholder}} tokens with actual employee data.
     * Supports custom_fields for ad-hoc overrides / fill-in values.
     */
    public function render(Request $request, $id): JsonResponse
    {
        $template = DocumentTemplate::findOrFail($id);

        $request->validate([
            'employee_id'   => 'required|exists:employees,id',
            'custom_fields' => 'nullable|array',
        ]);

        $employee = Employee::with(['role', 'department', 'currentContract'])->findOrFail($request->employee_id);

        // Fetch company name from settings (fallback to default)
        $companyName = '';
        try {
            $settings = \App\Models\Setting::first();
            $companyName = $settings->company_name ?? $settings->company_name_ar ?? '';
        } catch (\Throwable $e) {
            $companyName = '';
        }

        // Build comprehensive replacement map
        $html = $template->body_html;
        $replacements = [
            // ── Company ──
            '{{company_name}}'       => $companyName,

            // ── Employee core ──
            '{{employee_name}}'      => $employee->full_name,
            '{{employee_code}}'      => $employee->employee_code,
            '{{employee_email}}'     => $employee->email ?? '',
            '{{employee_phone}}'     => $employee->phone ?? '',
            '{{employee_national_id}}'=> $employee->national_id ?? '',

            // ── Organisational ──
            '{{department}}'         => $employee->department?->name_ar ?? '',
            '{{department_en}}'      => $employee->department?->name_en ?? '',
            '{{role}}'               => $employee->role?->role_name_ar ?? '',
            '{{role_en}}'            => $employee->role?->role_name_en ?? '',

            // ── Employment ──
            '{{hire_date}}'          => $employee->hire_date ? date('Y-m-d', strtotime($employee->hire_date)) : '',
            '{{base_salary}}'        => number_format($employee->base_salary, 2),
            '{{contract_type}}'      => $employee->contract_type ?? '',
            '{{employment_status}}'  => $employee->employment_status ?? '',

            // ── Dates ──
            '{{today_date}}'         => now()->format('Y-m-d'),
            '{{today_date_hijri}}'   => now()->format('Y-m-d'), // Placeholder for Hijri conversion
            '{{reference_number}}'   => 'REF-' . now()->format('Ymd') . '-' . str_pad($template->id, 4, '0', STR_PAD_LEFT),
        ];

        // Apply custom field overrides
        if ($request->filled('custom_fields')) {
            foreach ($request->custom_fields as $key => $value) {
                $replacements["{{" . $key . "}}"] = $value;
            }
        }

        $html = str_replace(array_keys($replacements), array_values($replacements), $html);

        return $this->successResponse([
            'rendered_html' => $html,
            'template'      => $template->toArray(),
            'employee'      => $employee->toArray(),
            'placeholders'  => array_keys($replacements),
        ]);
    }
}
