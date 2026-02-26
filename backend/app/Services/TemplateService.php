<?php

namespace App\Services;

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Centralized Template Service
 * 
 * This service enforces that all modules use system templates exclusively.
 * It provides a single point of access for template operations and ensures
 * compliance with the Report and Document Management Policy.
 * 
 * Key responsibilities:
 * - Enforce use of approved system templates only
 * - Validate template structure and keys
 * - Manage template lifecycle (create, update, versioning)
 * - Provide template lookup by type and key
 */
class TemplateService
{
    protected TemplateRegistry $registry;
    protected TemplateRenderer $renderer;

    public function __construct(TemplateRegistry $registry, TemplateRenderer $renderer)
    {
        $this->registry = $registry;
        $this->renderer = $renderer;
    }

    /**
     * Get active template by type and optional key.
     * 
     * @param string $type Template type (must be approved)
     * @param string|null $key Optional template key
     * @param string|null $language Optional language filter
     * @return DocumentTemplate|null
     * @throws \Exception If type is not approved
     */
    public function getTemplate(string $type, ?string $key = null, ?string $language = null): ?DocumentTemplate
    {
        // Validate type is approved
        if (!$this->registry->isApprovedType($type)) {
            throw new \Exception("Template type '{$type}' is not an approved system type. Only templates from the system templates directory can be used.");
        }

        $query = DocumentTemplate::where('template_type', $type)
            ->where('is_active', true);

        if ($key) {
            $query->where('template_key', $key);
        }

        // If language specified, filter by language (assuming language is stored in template)
        // This may need adjustment based on your schema
        if ($language) {
            // You may need to add a language column or handle this differently
            // For now, we'll assume templates can be filtered by a language field if it exists
        }

        return $query->orderBy('created_at', 'desc')->first();
    }

    /**
     * Get all active templates of a specific type.
     * 
     * @param string $type Template type
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getTemplatesByType(string $type)
    {
        if (!$this->registry->isApprovedType($type)) {
            throw new \Exception("Template type '{$type}' is not an approved system type");
        }

        return DocumentTemplate::where('template_type', $type)
            ->where('is_active', true)
            ->orderBy('template_name_ar')
            ->get();
    }

    /**
     * Create a new system template with validation.
     * 
     * @param array $data Template data
     * @return DocumentTemplate
     * @throws \Exception If validation fails
     */
    public function createTemplate(array $data): DocumentTemplate
    {
        // Validate template type
        if (!isset($data['template_type']) || !$this->registry->isApprovedType($data['template_type'])) {
            throw new \Exception("Template type '{$data['template_type']}' is not an approved system type");
        }

        // Validate template keys
        if (isset($data['body_html'])) {
            $invalidKeys = $this->registry->validateTemplateKeys($data['template_type'], $data['body_html']);
            if (!empty($invalidKeys)) {
                throw new \Exception("Template contains unapproved keys: " . implode(', ', $invalidKeys));
            }
        }

        // Ensure template_key is unique
        if (isset($data['template_key'])) {
            $exists = DocumentTemplate::where('template_key', $data['template_key'])->exists();
            if ($exists) {
                throw new \Exception("Template key '{$data['template_key']}' already exists");
            }
        }

        // Set created_by if not provided
        if (!isset($data['created_by']) && auth()->check()) {
            $data['created_by'] = auth()->id();
        }

        // Set default is_active if not provided
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }

        return DocumentTemplate::create($data);
    }

    /**
     * Update a template and create history record.
     * 
     * @param int $id Template ID
     * @param array $data Update data
     * @return DocumentTemplate
     * @throws \Exception If validation fails
     */
    public function updateTemplate(int $id, array $data): DocumentTemplate
    {
        $template = DocumentTemplate::findOrFail($id);

        // Validate template type if being changed
        if (isset($data['template_type'])) {
            if (!$this->registry->isApprovedType($data['template_type'])) {
                throw new \Exception("Template type '{$data['template_type']}' is not an approved system type");
            }
        }

        // Validate template keys if body_html is being updated
        if (isset($data['body_html'])) {
            $type = $data['template_type'] ?? $template->template_type;
            $invalidKeys = $this->registry->validateTemplateKeys($type, $data['body_html']);
            if (!empty($invalidKeys)) {
                throw new \Exception("Template contains unapproved keys: " . implode(', ', $invalidKeys));
            }

            // Create history record if body_html changed
            if ($data['body_html'] !== $template->body_html) {
                DocumentTemplateHistory::create([
                    'document_template_id' => $template->id,
                    'body_html'            => $template->body_html,
                    'created_by'           => auth()->id() ?? $template->created_by,
                ]);
            }
        }

        $template->update($data);
        return $template->fresh();
    }

    /**
     * Render a template with provided context.
     * 
     * @param int|string $templateIdOrKey Template ID or key
     * @param array $context Data context
     * @param string|null $language Language code
     * @return string Rendered HTML
     */
    public function renderTemplate($templateIdOrKey, array $context, ?string $language = 'ar'): string
    {
        // Load template
        if (is_numeric($templateIdOrKey)) {
            $template = DocumentTemplate::findOrFail($templateIdOrKey);
        } else {
            $template = DocumentTemplate::where('template_key', $templateIdOrKey)
                ->where('is_active', true)
                ->firstOrFail();
        }

        return $this->renderer->render($template, $context, $language);
    }

    /**
     * Render template by type (uses default template for that type).
     * 
     * @param string $type Template type
     * @param array $context Data context
     * @param string|null $language Language code
     * @return string Rendered HTML
     */
    public function renderTemplateByType(string $type, array $context, ?string $language = 'ar'): string
    {
        $template = $this->getTemplate($type);
        
        if (!$template) {
            throw new \Exception("No active template found for type '{$type}'. Please ensure a template exists in the system templates directory.");
        }

        return $this->renderer->render($template, $context, $language);
    }

    /**
     * Validate a template's structure and keys.
     * 
     * @param string $type Template type
     * @param string $html Template HTML
     * @return array ['valid' => bool, 'errors' => array]
     */
    public function validateTemplate(string $type, string $html): array
    {
        $errors = [];

        // Check type is approved
        if (!$this->registry->isApprovedType($type)) {
            $errors[] = "Template type '{$type}' is not approved";
        }

        // Check keys are approved
        $invalidKeys = $this->registry->validateTemplateKeys($type, $html);
        if (!empty($invalidKeys)) {
            $errors[] = "Unapproved keys found: " . implode(', ', $invalidKeys);
        }

        // Check for forbidden elements (JavaScript, etc.)
        if (preg_match('/<script[^>]*>/i', $html)) {
            $errors[] = "Templates cannot contain JavaScript";
        }

        // Check for external calls
        if (preg_match('/src=["\'](https?|ftp):/i', $html)) {
            $errors[] = "Templates cannot contain external resource calls";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get template history.
     * 
     * @param int $templateId Template ID
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getTemplateHistory(int $templateId)
    {
        return DocumentTemplateHistory::where('document_template_id', $templateId)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Deactivate a template (soft delete by setting is_active = false).
     * 
     * @param int $id Template ID
     * @return bool
     */
    public function deactivateTemplate(int $id): bool
    {
        $template = DocumentTemplate::findOrFail($id);
        return $template->update(['is_active' => false]);
    }

    /**
     * Get approved keys for a template type.
     * Useful for template editors.
     * 
     * @param string $type Template type
     * @return array
     */
    public function getApprovedKeysForType(string $type): array
    {
        return $this->registry->getApprovedKeysList($type);
    }
}

