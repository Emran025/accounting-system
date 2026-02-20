"use client";

// Enhanced HTML syntax highlighter (no external deps)
export function highlightHTML(code: string, approvedKeys: string[]): string {
    if (!code) return "";
    
    // Escape HTML first
    let escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Highlight {{keys}} FIRST (before other processing to avoid conflicts)
    escaped = escaped.replace(
        /(\{\{)([\w.]+)(\}\})/g,
        (match, open, key, close) => {
            const isValid = approvedKeys.includes(key);
            const cls = isValid ? "tml-key-valid" : "tml-key-invalid";
            return `<span class="${cls}">${open}${key}${close}</span>`;
        }
    );

    // Highlight HTML comments
    escaped = escaped.replace(
        /(&lt;!--[\s\S]*?--&gt;)/g,
        '<span class="tml-comment">$1</span>'
    );

    // Highlight HTML tags (improved regex to handle self-closing tags)
    escaped = escaped.replace(
        /(&lt;)(\/?)([\w-]+)([\s\S]*?)(\/?)(&gt;)/g,
        (match, open, slash, tagName, attrs, selfClose, close) => {
            // Skip if already inside a comment
            if (match.includes('tml-comment')) return match;
            return `<span class="tml-tag">${open}</span>${slash ? '<span class="tml-tag">/</span>' : ''}<span class="tml-tag-name">${tagName}</span>${attrs}${selfClose ? '<span class="tml-tag">/</span>' : ''}<span class="tml-tag">${close}</span>`;
        }
    );

    // Highlight HTML attributes (more precise regex)
    escaped = escaped.replace(
        /(\s+)([\w-]+)(\s*=\s*)(["'])([^"']*?)(\4)/g,
        (match, space, attrName, equals, quote, value, quoteClose) => {
            // Skip if already processed
            if (match.includes('tml-')) return match;
            return `${space}<span class="tml-attr">${attrName}</span><span class="tml-punct">${equals}</span><span class="tml-string">${quote}${value}${quoteClose}</span>`;
        }
    );

    // Highlight CSS properties and values (inside style tags or style attributes)
    escaped = escaped.replace(
        /([\w-]+)(\s*:\s*)([^;]+)(;?)/g,
        (match, prop, colon, value, semicolon) => {
            // Only highlight if it looks like CSS (not already highlighted)
            if (match.includes('tml-') || match.includes('tml-key-')) return match;
            // Check if it's likely CSS (has a colon and value)
            if (prop.length > 0 && value.trim().length > 0 && !prop.includes('&')) {
                return `<span class="tml-css-prop">${prop}</span>${colon}<span class="tml-css-value">${value}</span>${semicolon}`;
            }
            return match;
        }
    );

    return escaped;
}

// Validation logic
export interface KeyValidation {
    key: string;
    valid: boolean;
    line: number;
    column: number;
}

export function validateTemplateKeys(html: string, approvedKeys: string[]): KeyValidation[] {
    const regex = /\{\{([\w.]+)\}\}/g;
    const validations: KeyValidation[] = [];
    const lines = html.split("\n");

    lines.forEach((line, lineIdx) => {
        let match;
        const lineRegex = /\{\{([\w.]+)\}\}/g;
        while ((match = lineRegex.exec(line)) !== null) {
            validations.push({
                key: match[1],
                valid: approvedKeys.includes(match[1]),
                line: lineIdx + 1,
                column: match.index + 1,
            });
        }
    });

    return validations;
}

export function detectForbiddenElements(html: string): string[] {
    const issues: string[] = [];
    if (/<script[\s>]/i.test(html)) issues.push("عنصر <script> ممنوع في القوالب");
    if (/\bon\w+\s*=/i.test(html)) issues.push("أحداث JavaScript مضمنة (onclick, onload...) ممنوعة");
    if (/<iframe[\s>]/i.test(html)) issues.push("عنصر <iframe> ممنوع");
    if (/<form[\s>]/i.test(html)) issues.push("عنصر <form> ممنوع");
    if (/javascript\s*:/i.test(html)) issues.push("بروتوكول javascript: ممنوع");
    if (/<link.*rel\s*=\s*["']?import/i.test(html)) issues.push("استيراد روابط خارجية ممنوع");
    return issues;
}

export function generatePreviewHtml(html: string, context: Record<string, string>): string {
    let result = html;
    for (const [key, value] of Object.entries(context)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    // Mark remaining unresolved keys
    result = result.replace(
        /\{\{([\w.]+)\}\}/g,
        '<span style="background:#fecaca;color:#dc2626;padding:1px 4px;border-radius:3px;font-size:11px;">⚠ {{$1}}</span>'
    );
    return result;
}
export function formatHTML(html: string): string {
    let tab = '    ';
    let result = '';
    let indent = '';

    html.split(/>\s*</).forEach(function (element) {
        if (element.match(/^\/\w/)) {
            indent = indent.substring(tab.length);
        }

        result += indent + '<' + element + '>\r\n';

        if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input") && !element.startsWith("img") && !element.startsWith("br") && !element.startsWith("hr")) {
            indent += tab;
        }
    });

    return result.substring(1, result.length - 3);
}

// Enhanced HTML formatter that preserves {{keys}} and template syntax
export function prettifyHTML(html: string): string {
    if (!html || !html.trim()) return html;
    
    // Preserve {{keys}} by temporarily replacing them
    const keyPlaceholders: string[] = [];
    let placeholderIndex = 0;
    const keyRegex = /\{\{[\w.]+\}\}/g;
    const htmlWithPlaceholders = html.replace(keyRegex, (match) => {
        const placeholder = `__TEMPLATE_KEY_${placeholderIndex++}__`;
        keyPlaceholders.push(match);
        return placeholder;
    });

    // Clean up the HTML
    let cleaned = htmlWithPlaceholders
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim();

    // Format with proper indentation
    let formatted = '';
    let indent = 0;
    const indentSize = 4;
    const indentStr = ' '.repeat(indentSize);
    
    // Self-closing tags that shouldn't increase indent
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // Tags that should be on the same line
    const inlineTags = ['span', 'strong', 'em', 'b', 'i', 'u', 'small', 'mark', 'del', 'ins', 'sub', 'sup'];
    
    // Split by tags but preserve them
    const tagRegex = /(<\/?[\w-]+(?:\s+[^>]*)?\/?>)/g;
    const parts = cleaned.split(tagRegex).filter(p => p.trim());
    
    let i = 0;
    while (i < parts.length) {
        const part = parts[i].trim();
        
        if (!part) {
            i++;
            continue;
        }
        
        // Check if it's a closing tag
        if (part.startsWith('</')) {
            indent = Math.max(0, indent - 1);
            formatted += indentStr.repeat(indent) + part + '\n';
        }
        // Check if it's an opening tag
        else if (part.startsWith('<')) {
            const tagMatch = part.match(/<\/?([\w-]+)/);
            const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
            const isSelfClosing = part.endsWith('/>') || selfClosingTags.includes(tagName);
            const isInline = inlineTags.includes(tagName);
            
            formatted += indentStr.repeat(indent) + part;
            
            if (!isSelfClosing && !isInline) {
                formatted += '\n';
                indent++;
            } else {
                formatted += '\n';
            }
        }
        // Text content
        else {
            formatted += indentStr.repeat(indent) + part + '\n';
        }
        
        i++;
    }
    
    // Restore {{keys}}
    keyPlaceholders.forEach((key, index) => {
        formatted = formatted.replace(`__TEMPLATE_KEY_${index}__`, key);
    });
    
    // Clean up extra blank lines (max 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
}
