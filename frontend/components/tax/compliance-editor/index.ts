/**
 * Compliance Editor Module
 *
 * A professional editor for configuring tax/compliance transmission profiles.
 * Supports Push (Policy 1) and Pull (Policy 2) data transmission with
 * JSON, XML, YML, and Excel format options.
 *
 * @module compliance-editor
 */

export { ComplianceProfileEditor } from "./ComplianceProfileEditor";
export { FormatEditor } from "./FormatEditor";
export type {
    ComplianceProfileEditorProps,
    FormatEditorProps,
    ComplianceProfile,
    PolicyType,
    TransmissionFormat,
    EditorFormat,
    AuthType,
    SystemKey,
    SystemKeyGroup,
    KeyMappingEntry,
    TaxAuthority,
} from "./types";
export {
    highlightCode,
    validateFormat,
    generateDefaultTemplate,
    prettifyCode,
} from "./utils";
export type { ValidationResult } from "./utils";
