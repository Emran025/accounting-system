/**
 * Template Editor Module
 * 
 * A professional code editor component for creating and editing HTML templates
 * with live preview, syntax highlighting, and validation.
 * 
 * @module template-editor
 */

export { TemplateEditor } from "./TemplateEditor";
export type { TemplateEditorProps, TemplateData, TemplateField } from "./types";
export {
    highlightHTML,
    validateTemplateKeys,
    detectForbiddenElements,
    generatePreviewHtml,
    prettifyHTML,
    formatHTML
} from "./utils";
export type { KeyValidation } from "./utils";

