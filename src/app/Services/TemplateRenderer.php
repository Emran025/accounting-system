<?php

namespace App\Services;

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateHistory;
use Illuminate\Support\Facades\Log;

/**
 * Template Renderer Service
 * 
 * Centralized service for rendering templates with data.
 * This service enforces the use of system templates exclusively and ensures
 * all template rendering follows the architectural policy.
 * 
 * Per the Report and Document Management Policy:
 * - Templates receive prepared data only (no database queries)
 * - Templates are static HTML/CSS only (no JavaScript or logic)
 * - All rendering goes through this centralized service
 */
class TemplateRenderer
{
    protected TemplateRegistry $registry;

    public function __construct(TemplateRegistry $registry)
    {
        $this->registry = $registry;
    }

    /**
     * Render a template with the provided context data.
     * 
     * @param DocumentTemplate|int $template Template instance or ID
     * @param array $context Data context to inject into template
     * @param string|null $language Language code (ar, en) - affects text direction
     * @return string Rendered HTML
     * @throws \Exception If template is invalid or rendering fails
     */
    public function render($template, array $context, ?string $language = 'ar'): string
    {
        // Load template if ID provided
        if (is_int($template)) {
            $template = DocumentTemplate::findOrFail($template);
        }

        if (!$template instanceof DocumentTemplate) {
            throw new \InvalidArgumentException('Template must be a DocumentTemplate instance or valid ID');
        }

        // Ensure template is active
        if (!$template->is_active) {
            throw new \Exception("Template '{$template->template_key}' is not active");
        }

        // Validate template type is approved
        if (!$this->registry->isApprovedType($template->template_type)) {
            throw new \Exception("Template type '{$template->template_type}' is not an approved system type");
        }

        // Validate all keys in template are approved
        $invalidKeys = $this->registry->validateTemplateKeys($template->template_type, $template->body_html);
        if (!empty($invalidKeys)) {
            throw new \Exception("Template contains unapproved keys: " . implode(', ', $invalidKeys));
        }

        // Prepare replacement map from context
        $replacements = $this->prepareReplacements($context, $template->template_type);

        // Perform substitution
        $html = $template->body_html;
        $html = $this->performSubstitution($html, $replacements);

        // Apply language-specific formatting
        $html = $this->applyLanguageFormatting($html, $language);

        return $html;
    }

    /**
     * Render template with mock data for preview purposes.
     * 
     * @param DocumentTemplate|int $template Template instance or ID
     * @param string|null $language Language code
     * @return string Rendered HTML with mock data
     */
    public function renderPreview($template, ?string $language = 'ar'): string
    {
        if (is_int($template)) {
            $template = DocumentTemplate::findOrFail($template);
        }

        $mockContext = $this->getMockContext($template->template_type);
        return $this->render($template, $mockContext, $language);
    }

    /**
     * Prepare replacement map from context data.
     * Flattens nested arrays and formats values appropriately.
     */
    protected function prepareReplacements(array $context, string $templateType): array
    {
        $replacements = [];
        
        // Flatten context array
        $flatContext = $this->flattenArray($context);
        
        // Build replacement map with {{key}} format
        foreach ($flatContext as $key => $value) {
            $replacements["{{{$key}}}"] = $this->formatValue($value);
        }

        // Add common system values
        $replacements['{{today_date}}'] = now()->format('Y-m-d');
        $replacements['{{reference_number}}'] = 'REF-' . now()->format('YmdHis');

        // Load company settings if available
        try {
            $settings = \App\Models\Setting::first();
            if ($settings) {
                $replacements['{{company_name}}'] = $settings->company_name ?? $settings->company_name_ar ?? '';
                $replacements['{{company_address}}'] = $settings->company_address ?? '';
                $replacements['{{company_tax_id}}'] = $settings->tax_id ?? '';
            }
        } catch (\Throwable $e) {
            // Silently fail if settings not available
            Log::warning('Could not load company settings for template rendering', ['error' => $e->getMessage()]);
        }

        return $replacements;
    }

    /**
     * Flatten nested array structure.
     * Converts ['employee' => ['name' => 'John']] to ['employee_name' => 'John']
     */
    protected function flattenArray(array $array, string $prefix = ''): array
    {
        $result = [];
        
        foreach ($array as $key => $value) {
            $newKey = $prefix ? "{$prefix}_{$key}" : $key;
            
            if (is_array($value) && !isset($value[0])) {
                // Associative array - recurse
                $result = array_merge($result, $this->flattenArray($value, $newKey));
            } else {
                // Scalar or indexed array - use as is
                $result[$newKey] = $value;
            }
        }
        
        return $result;
    }

    /**
     * Format value for template insertion.
     */
    protected function formatValue($value): string
    {
        if (is_null($value)) {
            return '';
        }
        
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        
        if (is_numeric($value)) {
            return (string) $value;
        }
        
        if (is_array($value)) {
            // For arrays, create a simple representation
            return implode(', ', array_map([$this, 'formatValue'], $value));
        }
        
        return (string) $value;
    }

    /**
     * Perform placeholder substitution in template HTML.
     */
    protected function performSubstitution(string $html, array $replacements): string
    {
        // Replace all placeholders
        $html = str_replace(array_keys($replacements), array_values($replacements), $html);
        
        // Remove any remaining unmatched placeholders (optional - can be configured)
        // $html = preg_replace('/\{\{[^}]+\}\}/', '', $html);
        
        return $html;
    }

    /**
     * Apply language-specific formatting (RTL/LTR, date formats, etc.)
     */
    protected function applyLanguageFormatting(string $html, string $language): string
    {
        // Add language direction attribute if not present
        if ($language === 'ar' && !str_contains($html, 'dir="rtl"') && !str_contains($html, "dir='rtl'")) {
            // Try to wrap in a div with RTL direction if body/html tags exist
            if (str_contains($html, '<body') || str_contains($html, '<html')) {
                // HTML structure already exists, add dir to body/html
                $html = preg_replace('/(<body[^>]*>)/i', '$1<dir="rtl">', $html);
            } else {
                // No HTML structure, wrap content
                $html = '<div dir="rtl">' . $html . '</div>';
            }
        }
        
        return $html;
    }

    /**
     * Get mock context data for a template type.
     * Used for preview/testing purposes.
     */
    protected function getMockContext(string $templateType): array
    {
        $approvedKeys = TemplateRegistry::getApprovedKeys($templateType);
        $mockContext = [];

        foreach ($approvedKeys as $key => $metadata) {
            switch ($metadata['type']) {
                case 'string':
                    $mockContext[$key] = "Sample {$key}";
                    break;
                case 'number':
                    $mockContext[$key] = 1000.00;
                    break;
                case 'date':
                    $mockContext[$key] = now()->format('Y-m-d');
                    break;
                case 'array':
                    $mockContext[$key] = ['Item 1', 'Item 2'];
                    break;
                default:
                    $mockContext[$key] = "Mock {$key}";
            }
        }

        return $mockContext;
    }

    /**
     * Generate PDF from rendered template (if PDF library available).
     * This is a placeholder for future PDF generation functionality.
     */
    public function renderToPdf(string $renderedHtml, array $options = []): string
    {
        // TODO: Implement PDF generation using DomPDF, Snappy, or similar
        // This should be a separate service to maintain separation of concerns
        throw new \Exception('PDF generation not yet implemented');
    }
}

