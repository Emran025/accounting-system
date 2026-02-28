"use client";

import type { EditorFormat } from "./types";

// ═══════════════════════════════════════════════════
// Syntax Highlighting (Zero-dep)
// ═══════════════════════════════════════════════════

/**
 * Highlight JSON with syntax colors.
 */
function highlightJSON(code: string, systemKeys: string[]): string {
    if (!code) return "";
    let escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Highlight string values: "value"
    escaped = escaped.replace(
        /("(?:[^"\\]|\\.)*")\s*(?=:)/g,
        (match, key) => {
            // This is a JSON key
            const rawKey = key.slice(1, -1);
            const isSystemKey = systemKeys.includes(rawKey);
            const cls = isSystemKey ? "ce-key-system" : "ce-key-entity";
            return `<span class="${cls}">${key}</span>`;
        }
    );

    // Highlight string values (not keys)
    escaped = escaped.replace(
        /:\s*("(?:[^"\\]|\\.)*")/g,
        (match, val) => {
            const rawVal = val.slice(1, -1);
            const isSystemKey = systemKeys.includes(rawVal);
            if (isSystemKey) {
                return `: <span class="ce-val-mapped">${val}</span>`;
            }
            return `: <span class="ce-val-string">${val}</span>`;
        }
    );

    // Highlight numbers
    escaped = escaped.replace(
        /:\s*(\d+\.?\d*)/g,
        ': <span class="ce-val-number">$1</span>'
    );

    // Highlight booleans and null
    escaped = escaped.replace(
        /:\s*(true|false|null)\b/gi,
        ': <span class="ce-val-bool">$1</span>'
    );

    // Highlight punctuation
    escaped = escaped.replace(
        /([{}[\],:])/g,
        '<span class="ce-punct">$1</span>'
    );

    return escaped;
}

/**
 * Highlight XML with syntax colors.
 */
function highlightXML(code: string, systemKeys: string[]): string {
    if (!code) return "";
    let escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Highlight XML comments
    escaped = escaped.replace(
        /(&lt;!--[\s\S]*?--&gt;)/g,
        '<span class="ce-xml-comment">$1</span>'
    );

    // Highlight XML tags
    escaped = escaped.replace(
        /(&lt;)(\/?)(\w[\w.-]*)([\s\S]*?)(\/?)(&gt;)/g,
        (match, open, slash, tagName, attrs, selfClose, close) => {
            if (match.includes('ce-xml-comment')) return match;
            const isSystem = systemKeys.includes(tagName);
            const tagCls = isSystem ? "ce-tag-system" : "ce-tag-name";
            return `<span class="ce-tag">${open}</span>${slash ? '<span class="ce-tag">/</span>' : ''}<span class="${tagCls}">${tagName}</span>${attrs}${selfClose ? '<span class="ce-tag">/</span>' : ''}<span class="ce-tag">${close}</span>`;
        }
    );

    // Highlight XML attributes
    escaped = escaped.replace(
        /(\s+)([\w-]+)(\s*=\s*)(["'])([^"']*?)(\4)/g,
        (match, space, attrName, equals, quote, value, q2) => {
            if (match.includes('ce-')) return match;
            return `${space}<span class="ce-xml-attr">${attrName}</span><span class="ce-punct">${equals}</span><span class="ce-val-string">${quote}${value}${q2}</span>`;
        }
    );

    return escaped;
}

/**
 * Highlight YAML with syntax colors.
 */
function highlightYML(code: string, systemKeys: string[]): string {
    if (!code) return "";
    let escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Process line by line
    const lines = escaped.split("\n");
    const highlighted = lines.map(line => {
        // Comments
        if (line.trimStart().startsWith("#")) {
            return `<span class="ce-yml-comment">${line}</span>`;
        }

        // Key: Value pairs
        const kvMatch = line.match(/^(\s*)([\w.-]+)(\s*:\s*)(.*)/);
        if (kvMatch) {
            const [, indent, key, colon, value] = kvMatch;
            const isSystem = systemKeys.includes(key);
            const keyCls = isSystem ? "ce-key-system" : "ce-yml-key";

            let highlightedValue = value;
            if (value.trim()) {
                const trimmed = value.trim();
                // Check if value is a system key reference
                if (systemKeys.includes(trimmed)) {
                    highlightedValue = `<span class="ce-val-mapped">${value}</span>`;
                } else if (/^\d+\.?\d*$/.test(trimmed)) {
                    highlightedValue = `<span class="ce-val-number">${value}</span>`;
                } else if (/^(true|false|null|~)$/i.test(trimmed)) {
                    highlightedValue = `<span class="ce-val-bool">${value}</span>`;
                } else if (/^["'].*["']$/.test(trimmed)) {
                    highlightedValue = `<span class="ce-val-string">${value}</span>`;
                } else {
                    highlightedValue = `<span class="ce-val-string">${value}</span>`;
                }
            }

            return `${indent}<span class="${keyCls}">${key}</span><span class="ce-punct">${colon}</span>${highlightedValue}`;
        }

        // List items
        const listMatch = line.match(/^(\s*)(- )(.*)/);
        if (listMatch) {
            const [, indent, dash, value] = listMatch;
            return `${indent}<span class="ce-punct">${dash}</span><span class="ce-val-string">${value}</span>`;
        }

        return line;
    });

    return highlighted.join("\n");
}

/**
 * Dispatch to the correct highlighter based on format.
 */
export function highlightCode(code: string, format: EditorFormat, systemKeys: string[]): string {
    switch (format) {
        case "json": return highlightJSON(code, systemKeys);
        case "xml": return highlightXML(code, systemKeys);
        case "yml": return highlightYML(code, systemKeys);
        default: return highlightJSON(code, systemKeys);
    }
}

// ═══════════════════════════════════════════════════
// Format Validation
// ═══════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateFormat(code: string, format: EditorFormat): ValidationResult {
    const errors: string[] = [];

    if (!code.trim()) {
        return { valid: true, errors: [] };
    }

    switch (format) {
        case "json": {
            try {
                JSON.parse(code);
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Invalid JSON";
                errors.push(msg);
            }
            break;
        }
        case "xml": {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(code, "application/xml");
                const parseError = doc.querySelector("parsererror");
                if (parseError) {
                    errors.push(parseError.textContent?.split("\n")[0] || "Invalid XML");
                }
            } catch {
                errors.push("XML parsing failed");
            }
            break;
        }
        case "yml": {
            // Basic YML validation
            const lines = code.split("\n");
            lines.forEach((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) return;

                // Check for tabs (YAML uses spaces)
                if (line.includes("\t")) {
                    errors.push(`Line ${idx + 1}: Tabs not allowed in YAML, use spaces`);
                }
            });
            break;
        }
    }

    return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════
// Template Generation
// ═══════════════════════════════════════════════════

/**
 * Generate a default structure template from key mappings.
 */
export function generateDefaultTemplate(
    keyMapping: Record<string, string>,
    format: EditorFormat
): string {
    const entries = Object.entries(keyMapping);

    switch (format) {
        case "json": {
            const obj: Record<string, string> = {};
            entries.forEach(([sysKey, entityKey]) => {
                obj[entityKey || sysKey] = `{{${sysKey}}}`;
            });
            return JSON.stringify(obj, null, 4);
        }
        case "xml": {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<report>\n';
            entries.forEach(([sysKey, entityKey]) => {
                const tag = entityKey || sysKey;
                xml += `    <${tag}>{{${sysKey}}}</${tag}>\n`;
            });
            xml += '</report>';
            return xml;
        }
        case "yml": {
            let yml = "# Compliance Report Structure\nreport:\n";
            entries.forEach(([sysKey, entityKey]) => {
                const key = entityKey || sysKey;
                yml += `  ${key}: "{{${sysKey}}}"\n`;
            });
            return yml;
        }
        default:
            return "";
    }
}

/**
 * Format / prettify code by format type.
 */
export function prettifyCode(code: string, format: EditorFormat): string {
    if (!code.trim()) return code;

    switch (format) {
        case "json": {
            try {
                const parsed = JSON.parse(code);
                return JSON.stringify(parsed, null, 4);
            } catch {
                return code;
            }
        }
        case "xml": {
            // Basic XML prettifier
            let formatted = '';
            let indent = 0;
            const indentStr = '    ';
            const parts = code.replace(/>\s*</g, '><').split(/(<[^>]+>)/);

            parts.forEach(part => {
                const trimmed = part.trim();
                if (!trimmed) return;

                if (trimmed.startsWith('</')) {
                    indent = Math.max(0, indent - 1);
                    formatted += indentStr.repeat(indent) + trimmed + '\n';
                } else if (trimmed.startsWith('<?')) {
                    formatted += trimmed + '\n';
                } else if (trimmed.startsWith('<') && trimmed.endsWith('/>')) {
                    formatted += indentStr.repeat(indent) + trimmed + '\n';
                } else if (trimmed.startsWith('<') && !trimmed.startsWith('</')) {
                    formatted += indentStr.repeat(indent) + trimmed + '\n';
                    if (!trimmed.includes('</')) {
                        indent++;
                    }
                } else {
                    formatted += indentStr.repeat(indent) + trimmed + '\n';
                }
            });
            return formatted.trim();
        }
        case "yml": {
            // YML is already pretty — just trim trailing spaces
            return code.split('\n').map(l => l.trimEnd()).join('\n').trim();
        }
        default:
            return code;
    }
}
