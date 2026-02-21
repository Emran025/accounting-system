<?php

namespace App\Services;

/**
 * Template Helper
 * 
 * Convenience helper class for modules to easily access template functionality.
 * This class provides static methods that wrap the TemplateService for easier usage.
 * 
 * Usage example:
 * ```php
 * use App\Services\TemplateHelper;
 * 
 * $html = TemplateHelper::render('sales_invoice', $context);
 * ```
 */
class TemplateHelper
{
    /**
     * Render a template by type using the default template for that type.
     * 
     * @param string $type Template type (e.g., 'sales_invoice')
     * @param array $context Data context
     * @param string|null $language Language code ('ar' or 'en')
     * @return string Rendered HTML
     * @throws \Exception
     */
    public static function render(string $type, array $context, ?string $language = 'ar'): string
    {
        $service = app(TemplateService::class);
        return $service->renderTemplateByType($type, $context, $language);
    }

    /**
     * Render a specific template by ID or key.
     * 
     * @param int|string $templateIdOrKey Template ID or key
     * @param array $context Data context
     * @param string|null $language Language code
     * @return string Rendered HTML
     * @throws \Exception
     */
    public static function renderTemplate($templateIdOrKey, array $context, ?string $language = 'ar'): string
    {
        $service = app(TemplateService::class);
        return $service->renderTemplate($templateIdOrKey, $context, $language);
    }

    /**
     * Get the active template for a specific type.
     * 
     * @param string $type Template type
     * @param string|null $key Optional template key
     * @return \App\Models\DocumentTemplate|null
     */
    public static function getTemplate(string $type, ?string $key = null)
    {
        $service = app(TemplateService::class);
        return $service->getTemplate($type, $key);
    }

    /**
     * Get all active templates for a type.
     * 
     * @param string $type Template type
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getTemplatesByType(string $type)
    {
        $service = app(TemplateService::class);
        return $service->getTemplatesByType($type);
    }

    /**
     * Check if a template type is approved.
     * 
     * @param string $type Template type
     * @return bool
     */
    public static function isApprovedType(string $type): bool
    {
        return app(TemplateRegistry::class)->isApprovedType($type);
    }

    /**
     * Get approved keys for a template type.
     * 
     * @param string $type Template type
     * @return array
     */
    public static function getApprovedKeys(string $type): array
    {
        return app(TemplateRegistry::class)->getApprovedKeysList($type);
    }

    /**
     * Validate template HTML against approved keys.
     * 
     * @param string $type Template type
     * @param string $html Template HTML
     * @return array ['valid' => bool, 'errors' => array]
     */
    public static function validate(string $type, string $html): array
    {
        $service = app(TemplateService::class);
        return $service->validateTemplate($type, $html);
    }
}

