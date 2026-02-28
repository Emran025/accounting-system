"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { showToast } from "@/components/ui";
import type { FormatEditorProps, SystemKey } from "./types";
import { highlightCode, validateFormat, prettifyCode, generateDefaultTemplate } from "./utils";

/**
 * FormatEditor – A dedicated JSON / YML / XML code editor
 * for mapping system keys → entity keys.
 *
 * Left panel: System keys (our keys) with entity-key input fields
 * Right panel: Editable output structure with syntax highlighting
 *
 * Styled to match the template-editor design language.
 */
export function FormatEditor({
    format,
    systemKeys,
    keyMapping,
    structureTemplate,
    onKeyMappingChange,
    onStructureChange,
    className = "",
}: FormatEditorProps) {
    // ── State ──
    const [keysSearchQuery, setKeysSearchQuery] = useState("");
    const [showKeysPanel, setShowKeysPanel] = useState(true);

    // ── Undo / Redo ──
    const [history, setHistory] = useState<string[]>([structureTemplate || ""]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // ── Refs ──
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const lineNumberRef = useRef<HTMLDivElement>(null);

    // ── Derived ──
    const systemKeyNames = useMemo(() => systemKeys.map(k => k.key), [systemKeys]);
    const mappedKeys = useMemo(() => Object.keys(keyMapping), [keyMapping]);

    // ── Validation ──
    const validationResult = useMemo(
        () => validateFormat(structureTemplate, format),
        [structureTemplate, format]
    );

    const lineCount = useMemo(
        () => (structureTemplate || "").split("\n").length,
        [structureTemplate]
    );

    // ── Update structure with history tracking ──
    const updateStructure = useCallback((newCode: string, fromHistory = false) => {
        onStructureChange(newCode);
        if (!fromHistory) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newCode);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }, [history, historyIndex, onStructureChange]);

    // Sync history when structureTemplate changes externally (e.g. format switch)
    useEffect(() => {
        setHistory([structureTemplate || ""]);
        setHistoryIndex(0);
    }, [format]);

    // ── Undo / Redo ──
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setHistoryIndex(historyIndex - 1);
            onStructureChange(prev);
        }
    }, [history, historyIndex, onStructureChange]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setHistoryIndex(historyIndex + 1);
            onStructureChange(next);
        }
    }, [history, historyIndex, onStructureChange]);

    // ── Sync scroll ──
    const handleEditorScroll = useCallback(() => {
        if (editorRef.current && lineNumberRef.current && highlightRef.current) {
            lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
            highlightRef.current.scrollTop = editorRef.current.scrollTop;
            highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
        }
    }, []);

    // ── Insert key at cursor ──
    const insertSystemKey = useCallback((key: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const entityKey = keyMapping[key] || key;

        let insertText = "";
        switch (format) {
            case "json":
                insertText = `"${entityKey}": "{{${key}}}"`;
                break;
            case "xml":
                insertText = `<${entityKey}>{{${key}}}</${entityKey}>`;
                break;
            case "yml":
                insertText = `${entityKey}: "{{${key}}}"`;
                break;
        }

        const newValue =
            structureTemplate.substring(0, start) +
            insertText +
            structureTemplate.substring(end);
        updateStructure(newValue);

        setTimeout(() => {
            editor.focus();
            editor.selectionStart = editor.selectionEnd = start + insertText.length;
        }, 0);
    }, [structureTemplate, keyMapping, format, updateStructure]);

    // ── Handle mapping change for a key ──
    const handleMappingChange = useCallback((systemKey: string, entityKey: string) => {
        const newMapping = { ...keyMapping };
        if (entityKey.trim()) {
            newMapping[systemKey] = entityKey.trim();
        } else {
            delete newMapping[systemKey];
        }
        onKeyMappingChange(newMapping);
    }, [keyMapping, onKeyMappingChange]);

    // ── Keyboard shortcuts ──
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
            e.preventDefault();
            handleRedo();
            return;
        }
        if (e.key === "Tab") {
            e.preventDefault();
            const editor = e.currentTarget;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const newValue = structureTemplate.substring(0, start) + "    " + structureTemplate.substring(end);
            updateStructure(newValue);
            setTimeout(() => {
                editor.selectionStart = editor.selectionEnd = start + 4;
            }, 0);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            const formatted = prettifyCode(structureTemplate, format);
            updateStructure(formatted);
            showToast("تم تنسيق الكود", "success");
            return;
        }
    }, [structureTemplate, format, handleUndo, handleRedo, updateStructure]);

    // ── Generate default template from current mappings ──
    const handleGenerateTemplate = useCallback(() => {
        if (Object.keys(keyMapping).length === 0) {
            showToast("يرجى تعيين مفاتيح أولاً", "warning");
            return;
        }
        const template = generateDefaultTemplate(keyMapping, format);
        updateStructure(template);
        showToast("تم إنشاء القالب من المفاتيح المعينة", "success");
    }, [keyMapping, format, updateStructure]);

    // ── Filtered keys ──
    const filteredKeys = useMemo(() => {
        if (!keysSearchQuery) return systemKeys;
        const q = keysSearchQuery.toLowerCase();
        return systemKeys.filter(k =>
            k.key.toLowerCase().includes(q) || k.label.includes(keysSearchQuery)
        );
    }, [keysSearchQuery, systemKeys]);

    // ── Format placeholders ──
    const getPlaceholder = (): string => {
        switch (format) {
            case "json": return '{\n    "entity_key": "{{system_key}}"\n}';
            case "xml": return '<?xml version="1.0" encoding="UTF-8"?>\n<report>\n    <entity_key>{{system_key}}</entity_key>\n</report>';
            case "yml": return '# Report Structure\nreport:\n  entity_key: "{{system_key}}"';
            default: return "";
        }
    };

    // ── RENDER ──
    return (
        <div className={`ce-main ${className}`}>
            {/* ── System Keys Panel ── */}
            {showKeysPanel && (
                <div className="ce-keys-panel">
                    <div className="ce-keys-header">
                        <h3><i className="fas fa-database" /> مفاتيح النظام</h3>
                        <button
                            className="ce-keys-close"
                            onClick={() => setShowKeysPanel(false)}
                            title="إخفاء"
                        >
                            <i className="fas fa-chevron-left" />
                        </button>
                    </div>
                    <div className="ce-keys-search">
                        <i className="fas fa-search" />
                        <input
                            type="text"
                            value={keysSearchQuery}
                            onChange={(e) => setKeysSearchQuery(e.target.value)}
                            placeholder="بحث في المفاتيح..."
                        />
                    </div>
                    <div className="ce-keys-list">
                        {filteredKeys.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "#8890a4" }}>
                                <i className="fas fa-search" style={{ fontSize: 32, opacity: 0.5, display: "block", marginBottom: 12 }} />
                                <span style={{ fontSize: 12 }}>لا توجد نتائج</span>
                            </div>
                        ) : (
                            filteredKeys.map((k) => {
                                const isMapped = mappedKeys.includes(k.key);
                                return (
                                    <div
                                        key={k.key}
                                        className={`ce-key-item ${isMapped ? "mapped" : ""}`}
                                    >
                                        <div className="ce-key-item-top">
                                            <code>{k.key}</code>
                                            {isMapped && <i className="fas fa-check-circle ce-key-mapped-icon" />}
                                        </div>
                                        <span className="ce-key-desc">{k.label}</span>
                                        <span className={`ce-key-type ce-key-type-${k.type}`}>{k.type}</span>

                                        {/* ── Mapping Input ── */}
                                        <div className="ce-key-mapping">
                                            <i className="fas fa-arrow-left" />
                                            <input
                                                type="text"
                                                value={keyMapping[k.key] || ""}
                                                onChange={(e) => handleMappingChange(k.key, e.target.value)}
                                                placeholder={k.key}
                                                title={`مفتاح الجهة البديل لـ ${k.key}`}
                                            />
                                            <button
                                                onClick={() => insertSystemKey(k.key)}
                                                style={{
                                                    border: "none",
                                                    background: "rgba(16, 185, 129, 0.1)",
                                                    color: "#10b981",
                                                    cursor: "pointer",
                                                    padding: "3px 6px",
                                                    borderRadius: 4,
                                                    fontSize: 10,
                                                    transition: "all 0.2s",
                                                }}
                                                title="إدراج في المحرر"
                                            >
                                                <i className="fas fa-plus" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── Editor ── */}
            <div className="ce-editor-area">
                {/* Tab Bar */}
                <div className="ce-editor-tabs">
                    <div className="ce-editor-tabs-left">
                        <div className="ce-tab active" style={{ cursor: "default", borderBottom: "none" }}>
                            <i className="fas fa-code" /> محرر الهيكل ({format.toUpperCase()})
                        </div>
                    </div>
                    <div className="ce-editor-tabs-right">
                        <button
                            className="ce-toolbar-btn"
                            onClick={handleGenerateTemplate}
                            title="إنشاء قالب من المفاتيح المعينة"
                        >
                            <i className="fas fa-magic" />
                        </button>
                        <button
                            className="ce-toolbar-btn"
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            title="تراجع (Ctrl+Z)"
                        >
                            <i className="fas fa-undo" />
                        </button>
                        <button
                            className="ce-toolbar-btn"
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            title="إعادة (Ctrl+Y)"
                        >
                            <i className="fas fa-redo" />
                        </button>
                        <button
                            className="ce-toolbar-btn"
                            onClick={() => {
                                const formatted = prettifyCode(structureTemplate, format);
                                updateStructure(formatted);
                                showToast("تم تنسيق الكود", "success");
                            }}
                            title="تنسيق الكود (Ctrl+K)"
                        >
                            <i className="fas fa-indent" />
                        </button>
                        {!showKeysPanel && (
                            <button
                                className="ce-keys-toggle"
                                onClick={() => setShowKeysPanel(true)}
                                title="إظهار المفاتيح"
                            >
                                <i className="fas fa-database" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Code Editor */}
                <div className="ce-code-container">
                    <div className="ce-line-numbers" ref={lineNumberRef}>
                        {Array.from({ length: lineCount }, (_, i) => (
                            <div key={i + 1} className="ce-line-num">{i + 1}</div>
                        ))}
                    </div>
                    <div className="ce-code-wrapper">
                        <pre
                            className="ce-highlight-layer"
                            ref={highlightRef}
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{
                                __html: highlightCode(structureTemplate || "", format, systemKeyNames) + "\n"
                            }}
                        />
                        <textarea
                            ref={editorRef}
                            className="ce-code-textarea"
                            value={structureTemplate || ""}
                            onChange={(e) => updateStructure(e.target.value)}
                            onScroll={handleEditorScroll}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            wrap="off"
                            placeholder={getPlaceholder()}
                            style={{ direction: "ltr", textAlign: "left" }}
                        />
                    </div>
                </div>

                {/* Validation Panel */}
                {!validationResult.valid && validationResult.errors.length > 0 && (
                    <div className="ce-validation-panel">
                        <div className="ce-validation-header">
                            <i className="fas fa-exclamation-circle" />
                            <span>أخطاء في الصياغة</span>
                        </div>
                        <div className="ce-validation-items">
                            {validationResult.errors.map((err, i) => (
                                <div key={i} className="ce-validation-item">
                                    <i className="fas fa-ban" />
                                    <span style={{ direction: "ltr", textAlign: "left" }}>{err}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
