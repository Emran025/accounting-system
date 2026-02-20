"use client";

export interface TemplateField {
    key: string;
    description: string;
    type: "string" | "number" | "date" | "boolean" | "list";
}

export interface TemplateData {
    template_key: string;
    template_name_ar: string;
    template_name_en?: string;
    template_type: string;
    body_html: string;
    description?: string;
    language: string;
}

export interface TemplateEditorProps {
    /** 
     * The template data to edit. 
     * If undefined/null, the editor is in "Create" mode. 
     */
    template?: Partial<TemplateData> | null;

    /** 
     * The module this template belongs to (e.g., "HR", "Sales", "Inventory"). 
     * Used for grouping and identifying the context.
     */
    moduleName: string;

    /** 
     * Optional dictionary mapping type keys to human-readable names.
     * Example: { contract: "عقد عمل", warning: "خطاب إنذار" }
     */
    templateTypeLabels?: Record<string, string>;

    /** 
     * The approved list of keys (fields) that can be used in the template. 
     */
    approvedKeys: TemplateField[];

    /** 
     * Mock data to display in the live preview. 
     * Keys should match those in `approvedKeys`. 
     */
    mockContext: Record<string, string>;

    /** 
     * Called when the user clicks 'Save'. 
     * Expects a promise that resolves on success and rejects on failure.
     */
    onSave: (data: TemplateData) => Promise<void>;

    /** 
     * Called when the user clicks 'Cancel'. 
     */
    onCancel: () => void;

    /** 
     * Additional CSS classes. 
     */
    className?: string;
}
