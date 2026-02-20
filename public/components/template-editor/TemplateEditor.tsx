"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button, showToast } from "@/components/ui";
import { TemplateEditorProps, TemplateData } from "./types";
import { highlightHTML, validateTemplateKeys, detectForbiddenElements, generatePreviewHtml, prettifyHTML } from "./utils";
import "./styles.css";

// ── Language options ──
const languageOptions = [
    { value: "ar", label: "العربية (RTL)" },
    { value: "en", label: "English (LTR)" },
];

export function TemplateEditor({
    template,
    moduleName,
    templateTypeLabels = {},
    approvedKeys,
    mockContext,
    onSave,
    onCancel,
    className = ""
}: TemplateEditorProps) {
    const isNew = !template;

    // ── Form State ──
    const [templateKey, setTemplateKey] = useState(template?.template_key || "");
    const [nameAr, setNameAr] = useState(template?.template_name_ar || "");
    const [nameEn, setNameEn] = useState(template?.template_name_en || "");
    const [templateType, setTemplateType] = useState(template?.template_type || "");
    const [description, setDescription] = useState(template?.description || "");
    const [language, setLanguage] = useState(template?.language || "ar");
    const [bodyHtml, setBodyHtml] = useState(template?.body_html || "");

    // ── Editor State ──
    const [isSaving, setIsSaving] = useState(false);
    const [showKeysPanel, setShowKeysPanel] = useState(true);
    const [keysSearchQuery, setKeysSearchQuery] = useState("");
    const [previewHtml, setPreviewHtml] = useState("");
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findQuery, setFindQuery] = useState("");
    const [replaceQuery, setReplaceQuery] = useState("");
    const [findMatchCase, setFindMatchCase] = useState(false);

    // Refs
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const lineNumberRef = useRef<HTMLDivElement>(null);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const findInputRef = useRef<HTMLInputElement>(null);

    // ── Sync with Props ──
    useEffect(() => {
        if (template) {
            setTemplateKey(template.template_key || "");
            setNameAr(template.template_name_ar || "");
            setNameEn(template.template_name_en || "");
            setTemplateType(template.template_type || "");
            setDescription(template.description || "");
            setLanguage(template.language || "ar");
            setBodyHtml(template.body_html || "");
        }
    }, [template]);

    // Set a default type if one isn't provided/selected
    useEffect(() => {
        if (!templateType && Object.keys(templateTypeLabels).length > 0) {
            setTemplateType(Object.keys(templateTypeLabels)[0]);
        }
    }, [templateType, templateTypeLabels]);

    // ── Validation ──
    const approvedKeyNames = useMemo(() => approvedKeys.map(k => k.key), [approvedKeys]);

    // Using utils
    const keyValidations = useMemo(() => validateTemplateKeys(bodyHtml, approvedKeyNames), [bodyHtml, approvedKeyNames]);
    const forbiddenIssues = useMemo(() => detectForbiddenElements(bodyHtml), [bodyHtml]);

    const invalidKeys = useMemo(() => keyValidations.filter(k => !k.valid), [keyValidations]);
    const validKeys = useMemo(() => keyValidations.filter(k => k.valid), [keyValidations]);
    const usedKeyNames = useMemo(() => [...new Set(keyValidations.map(k => k.key))], [keyValidations]);

    // ── Generate & Sync Preview HTML ──
    useEffect(() => {
        const dir = language === "ar" ? "rtl" : "ltr";
        const processed = generatePreviewHtml(bodyHtml, mockContext);
        const fullHtml = `<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:20px;font-family:'Tajawal','Segoe UI',sans-serif;background:#ffffff;} ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: #f1f1f1; } ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #555; }</style></head><body>${processed}</body></html>`;

        setPreviewHtml(fullHtml);
    }, [bodyHtml, language, mockContext]);

    // ── Write to iframe ──
    useEffect(() => {
        if (previewIframeRef.current && previewHtml) {
            const doc = previewIframeRef.current.contentDocument;
            if (doc) {
                setTimeout(() => {
                    const latestDoc = previewIframeRef.current?.contentDocument;
                    if (latestDoc) {
                        latestDoc.open();
                        latestDoc.write(previewHtml);
                        latestDoc.close();
                    }
                }, 0);
            }
        }
    }, [previewHtml]);

    // ── Sync scroll between editor and line numbers ──
    const handleEditorScroll = useCallback(() => {
        if (editorRef.current && lineNumberRef.current && highlightRef.current) {
            lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
            highlightRef.current.scrollTop = editorRef.current.scrollTop;
            highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
        }
    }, []);

    // ── Insert key at cursor position ──
    const insertKey = useCallback((key: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const placeholder = `{{${key}}}`;
        const newValue = bodyHtml.substring(0, start) + placeholder + bodyHtml.substring(end);
        setBodyHtml(newValue);
        setTimeout(() => {
            editor.focus();
            editor.selectionStart = editor.selectionEnd = start + placeholder.length;
        }, 0);
    }, [bodyHtml]);

    // ── Handle keyboard shortcuts ──
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Tab key - insert 4 spaces
        if (e.key === "Tab") {
            e.preventDefault();
            const editor = e.currentTarget;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const newValue = bodyHtml.substring(0, start) + "    " + bodyHtml.substring(end);
            setBodyHtml(newValue);
            setTimeout(() => {
                editor.selectionStart = editor.selectionEnd = start + 4;
            }, 0);
            return;
        }

        // Ctrl/Cmd + S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if (!isSaving && forbiddenIssues.length === 0 && invalidKeys.length === 0) {
                handleSave();
            }
            return;
        }

        // Ctrl/Cmd + F - Find
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            e.preventDefault();
            setShowFindReplace(true);
            setTimeout(() => findInputRef.current?.focus(), 0);
            return;
        }

        // Ctrl/Cmd + K - Format code
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            const formatted = prettifyHTML(bodyHtml);
            setBodyHtml(formatted);
            showToast("تم تنسيق الكود", "success");
            return;
        }

        // Escape - Close find/replace
        if (e.key === "Escape" && showFindReplace) {
            setShowFindReplace(false);
            editorRef.current?.focus();
            return;
        }
    }, [bodyHtml, isSaving, forbiddenIssues.length, invalidKeys.length, showFindReplace]);

    // ── Find and Replace functionality ──
    const handleFind = useCallback(() => {
        if (!findQuery || !editorRef.current) return;
        const editor = editorRef.current;
        const text = editor.value;
        const searchText = findMatchCase ? findQuery : findQuery.toLowerCase();
        const startPos = editor.selectionStart;
        const searchFrom = text.substring(startPos);
        const searchTextLower = findMatchCase ? searchText : searchText.toLowerCase();
        const index = searchFrom.toLowerCase().indexOf(searchTextLower);
        
        if (index !== -1) {
            const absoluteIndex = startPos + index;
            editor.selectionStart = absoluteIndex;
            editor.selectionEnd = absoluteIndex + findQuery.length;
            editor.focus();
            editor.scrollIntoView({ block: "center", behavior: "smooth" });
        } else {
            showToast("لم يتم العثور على النص", "warning");
        }
    }, [findQuery, findMatchCase]);

    const handleReplace = useCallback(() => {
        if (!findQuery || !editorRef.current) return;
        const editor = editorRef.current;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        
        if (findMatchCase ? selectedText === findQuery : selectedText.toLowerCase() === findQuery.toLowerCase()) {
            const newValue = bodyHtml.substring(0, start) + replaceQuery + bodyHtml.substring(end);
            setBodyHtml(newValue);
            setTimeout(() => {
                editor.selectionStart = editor.selectionEnd = start + replaceQuery.length;
                editor.focus();
            }, 0);
        } else {
            handleFind();
        }
    }, [findQuery, replaceQuery, findMatchCase, bodyHtml, handleFind]);

    const handleReplaceAll = useCallback(() => {
        if (!findQuery) return;
        const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), findMatchCase ? "g" : "gi");
        const newValue = bodyHtml.replace(regex, replaceQuery);
        setBodyHtml(newValue);
        showToast("تم استبدال جميع التطابقات", "success");
    }, [findQuery, replaceQuery, findMatchCase, bodyHtml]);

    // ── Line numbers ──
    const lineCount = useMemo(() => bodyHtml.split("\n").length, [bodyHtml]);

    // ── Save handler ──
    const handleSave = async () => {
        if (!templateKey.trim()) {
            showToast("مفتاح القالب مطلوب", "error");
            return;
        }
        if (!nameAr.trim()) {
            showToast("اسم القالب بالعربي مطلوب", "error");
            return;
        }
        if (forbiddenIssues.length > 0) {
            showToast("يحتوي القالب على عناصر ممنوعة – يرجى إصلاحها أولاً", "error");
            return;
        }
        if (invalidKeys.length > 0) {
            showToast(`يوجد ${invalidKeys.length} مفتاح غير معتمد – يرجى إصلاحها أولاً`, "error");
            return;
        }

        setIsSaving(true);
        try {
            // "Format on Save" behavior
            const formattedBody = prettifyHTML(bodyHtml);
            setBodyHtml(formattedBody);

            await onSave({
                template_key: templateKey,
                template_name_ar: nameAr,
                template_name_en: nameEn,
                template_type: templateType,
                body_html: formattedBody,
                description,
                language,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Filtered keys ──
    const sortedApprovedKeys = useMemo(() => {
        return [...approvedKeys].sort((a, b) => a.key.localeCompare(b.key));
    }, [approvedKeys]);

    const filteredKeys = useMemo(() => {
        if (!keysSearchQuery) return sortedApprovedKeys;
        const q = keysSearchQuery.toLowerCase();
        return sortedApprovedKeys.filter(k =>
            k.key.toLowerCase().includes(q) || k.description.includes(keysSearchQuery)
        );
    }, [keysSearchQuery, sortedApprovedKeys]);

    // ── Jump to line functionality ──
    const jumpToLine = useCallback((lineNumber: number) => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        const lines = bodyHtml.split("\n");
        if (lineNumber < 1 || lineNumber > lines.length) return;
        
        let position = 0;
        for (let i = 0; i < lineNumber - 1; i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        
        editor.selectionStart = editor.selectionEnd = position;
        editor.focus();
        editor.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [bodyHtml]);

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className={`template-editor ${className}`}>
            {/* ── Top Bar ── */}
            <div className="te-topbar">
                <div className="te-topbar-right">
                    <div className="te-topbar-title">
                        <i className="fas fa-file-code" />
                        <span>{isNew ? `إنشاء قالب جديد (${moduleName})` : `تعديل: ${template?.template_name_ar || ""} (${moduleName})`}</span>
                    </div>
                    <div className="te-status-badges">
                        {forbiddenIssues.length > 0 && (
                            <span className="te-badge te-badge-danger">
                                <i className="fas fa-exclamation-triangle" /> {forbiddenIssues.length} مخالفة
                            </span>
                        )}
                        {invalidKeys.length > 0 && (
                            <span className="te-badge te-badge-warning">
                                <i className="fas fa-key" /> {invalidKeys.length} مفتاح غير معتمد
                            </span>
                        )}
                        {forbiddenIssues.length === 0 && invalidKeys.length === 0 && bodyHtml.trim() && (
                            <span className="te-badge te-badge-success">
                                <i className="fas fa-check-circle" /> القالب صالح
                            </span>
                        )}
                        <span className="te-badge te-badge-info">
                            <i className="fas fa-hashtag" /> {lineCount} سطر
                        </span>
                        <span className="te-badge te-badge-info">
                            <i className="fas fa-key" /> {usedKeyNames.length} مفتاح مستخدم
                        </span>
                    </div>
                </div>
                <div className="te-topbar-actions">
                    <Button size="sm" variant="secondary" icon="times" onClick={onCancel}>إلغاء</Button>
                    <Button
                        size="sm"
                        variant="primary"
                        icon="save"
                        onClick={handleSave}
                        disabled={isSaving || forbiddenIssues.length > 0 || invalidKeys.length > 0}
                    >
                        {isSaving ? "جاري الحفظ..." : isNew ? "إنشاء القالب" : "حفظ التعديلات"}
                    </Button>
                </div>
            </div>

            {/* ── Definition Bar ── */}
            <div className="te-definition-bar">
                <div className="te-def-field">
                    <label>مفتاح القالب *</label>
                    <input
                        type="text"
                        value={templateKey}
                        onChange={(e) => setTemplateKey(e.target.value)}
                        placeholder="template_key"
                        disabled={!isNew}
                        className="te-input"
                    />
                </div>
                <div className="te-def-field">
                    <label>الاسم بالعربي *</label>
                    <input
                        type="text"
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder="اسم القالب (عربي)"
                        className="te-input"
                    />
                </div>
                <div className="te-def-field">
                    <label>الاسم بالإنجليزي</label>
                    <input
                        type="text"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder="Template Name (English)"
                        className="te-input"
                    />
                </div>
                {Object.keys(templateTypeLabels).length > 0 && (
                    <div className="te-def-field">
                        <label>نوع القالب</label>
                        <select
                            value={templateType}
                            onChange={(e) => setTemplateType(e.target.value)}
                            className="te-select"
                        >
                            {Object.entries(templateTypeLabels).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="te-def-field">
                    <label>اللغة *</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="te-select"
                        disabled={!isNew}
                    >
                        {languageOptions.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>
                <div className="te-def-field te-def-field-wide">
                    <label>الوصف</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="وصف مختصر للقالب..."
                        className="te-input"
                    />
                </div>
            </div>

            {/* ── Main Editor Area ── */}
            <div className="te-main">
                {/* ── Keys Panel ── */}
                {showKeysPanel && (
                    <div className="te-keys-panel">
                        <div className="te-keys-header">
                            <h3><i className="fas fa-key" /> المفاتيح المعتمدة</h3>
                            <button
                                className="te-keys-close"
                                onClick={() => setShowKeysPanel(false)}
                                title="إخفاء"
                            >
                                <i className="fas fa-chevron-left" />
                            </button>
                        </div>
                        <div className="te-keys-search">
                            <i className="fas fa-search" />
                            <input
                                type="text"
                                value={keysSearchQuery}
                                onChange={(e) => setKeysSearchQuery(e.target.value)}
                                placeholder="بحث..."
                            />
                        </div>
                        <div className="te-keys-list">
                            {filteredKeys.length === 0 ? (
                                <div className="te-keys-empty">
                                    <i className="fas fa-search" />
                                    <span>لا توجد نتائج</span>
                                </div>
                            ) : (
                                filteredKeys.map((k) => {
                                    const isUsed = usedKeyNames.includes(k.key);
                                    return (
                                        <button
                                            key={k.key}
                                            className={`te-key-item ${isUsed ? "used" : ""}`}
                                            onClick={() => insertKey(k.key)}
                                            title={`إدراج {{${k.key}}}`}
                                        >
                                            <div className="te-key-item-top">
                                                <code>{`{{${k.key}}}`}</code>
                                                {isUsed && <i className="fas fa-check-circle te-key-used-icon" />}
                                            </div>
                                            <span className="te-key-desc">{k.description}</span>
                                            <span className={`te-key-type te-key-type-${k.type}`}>{k.type}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── Editor / Preview Area ── */}
                <div className="te-editor-area">
                    {/* Tab bar header */}
                    <div className="te-editor-tabs">
                        <div className="te-editor-tabs-left">
                            <div className="te-tab active" style={{ cursor: 'default', borderBottom: 'none' }}>
                                <i className="fas fa-code" /> محرر الكود
                            </div>
                            <div className="te-tab active" style={{ cursor: 'default', borderBottom: 'none' }}>
                                <i className="fas fa-eye" /> المعاينة الحية
                            </div>
                        </div>
                        <div className="te-editor-tabs-right">
                            <div className="te-preview-controls">
                                <span className="te-preview-label">
                                    <i className="fas fa-flask" /> بيانات تجريبية حية
                                </span>
                            </div>
                            <button
                                className="te-toolbar-btn"
                                onClick={() => {
                                    setShowFindReplace(!showFindReplace);
                                    if (!showFindReplace) {
                                        setTimeout(() => findInputRef.current?.focus(), 0);
                                    }
                                }}
                                title="بحث واستبدال (Ctrl+F)"
                            >
                                <i className="fas fa-search" />
                            </button>
                            <button
                                className="te-toolbar-btn"
                                onClick={() => {
                                    const formatted = prettifyHTML(bodyHtml);
                                    setBodyHtml(formatted);
                                    showToast("تم تنسيق الكود", "success");
                                }}
                                title="تنسيق الكود (Ctrl+K)"
                            >
                                <i className="fas fa-indent" />
                            </button>
                            {!showKeysPanel && (
                                <button
                                    className="te-keys-toggle"
                                    onClick={() => setShowKeysPanel(true)}
                                    title="إظهار المفاتيح"
                                >
                                    <i className="fas fa-key" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Find/Replace Bar */}
                    {showFindReplace && (
                        <div className="te-find-replace-bar">
                            <div className="te-find-replace-group">
                                <input
                                    ref={findInputRef}
                                    type="text"
                                    value={findQuery}
                                    onChange={(e) => setFindQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleFind();
                                        }
                                    }}
                                    placeholder="بحث..."
                                    className="te-find-input"
                                />
                                <button
                                    className="te-find-btn"
                                    onClick={handleFind}
                                    title="بحث (Enter)"
                                >
                                    <i className="fas fa-arrow-down" />
                                </button>
                            </div>
                            <div className="te-find-replace-group">
                                <input
                                    type="text"
                                    value={replaceQuery}
                                    onChange={(e) => setReplaceQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleReplace();
                                        }
                                    }}
                                    placeholder="استبدال..."
                                    className="te-replace-input"
                                />
                                <button
                                    className="te-replace-btn"
                                    onClick={handleReplace}
                                    title="استبدال"
                                >
                                    <i className="fas fa-exchange-alt" />
                                </button>
                                <button
                                    className="te-replace-all-btn"
                                    onClick={handleReplaceAll}
                                    title="استبدال الكل"
                                >
                                    <i className="fas fa-sync" />
                                </button>
                            </div>
                            <div className="te-find-options">
                                <label className="te-find-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={findMatchCase}
                                        onChange={(e) => setFindMatchCase(e.target.checked)}
                                    />
                                    <span>حساس لحالة الأحرف</span>
                                </label>
                            </div>
                            <button
                                className="te-find-close"
                                onClick={() => {
                                    setShowFindReplace(false);
                                    editorRef.current?.focus();
                                }}
                                title="إغلاق (Esc)"
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>
                    )}

                    <div className="te-split-container">
                        {/* LEFT: Code Editor */}
                        <div className="te-code-container">
                            <div className="te-line-numbers" ref={lineNumberRef}>
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <div
                                        key={i + 1}
                                        className="te-line-num"
                                        onClick={() => jumpToLine(i + 1)}
                                        title={`الانتقال إلى السطر ${i + 1}`}
                                    >
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            <div className="te-code-wrapper">
                                <pre
                                    className="te-highlight-layer"
                                    ref={highlightRef}
                                    aria-hidden="true"
                                    dangerouslySetInnerHTML={{
                                        __html: highlightHTML(bodyHtml, approvedKeyNames) + "\n"
                                    }}
                                />
                                <textarea
                                    ref={editorRef}
                                    className="te-textarea"
                                    value={bodyHtml}
                                    onChange={(e) => setBodyHtml(e.target.value)}
                                    onScroll={handleEditorScroll}
                                    onKeyDown={handleKeyDown}
                                    spellCheck={false}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    wrap="off"
                                    placeholder="<!-- Start writing HTML and CSS structure here... -->"
                                    style={{ direction: 'ltr', textAlign: 'left' }}
                                />
                            </div>
                        </div>

                        {/* RIGHT: Live Preview */}
                        <div className="te-preview-container">
                            <div className="te-preview-toolbar">
                                <span className="te-preview-dir-badge">
                                    <i className={`fas fa-${language === "ar" ? "align-right" : "align-left"}`} />
                                    {language === "ar" ? "RTL" : "LTR"}
                                </span>
                                <span className="te-preview-lang-badge">
                                    {languageOptions.find(l => l.value === language)?.label}
                                </span>
                                <button
                                    className="te-preview-refresh"
                                    onClick={() => {
                                        const dir = language === "ar" ? "rtl" : "ltr";
                                        const processed = generatePreviewHtml(bodyHtml, mockContext);
                                        const fullHtml = `<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:20px;font-family:'Tajawal','Segoe UI',sans-serif;background:#ffffff;} ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: #f1f1f1; } ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #555; }</style></head><body>${processed}</body></html>`;
                                        setPreviewHtml(fullHtml);
                                    }}
                                    title="تحديث المعاينة"
                                >
                                    <i className="fas fa-sync-alt" />
                                </button>
                            </div>
                            <iframe
                                ref={previewIframeRef}
                                className="te-preview-iframe"
                                sandbox="allow-same-origin"
                                title="معاينة القالب"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom Validation Panel ── */}
            {(forbiddenIssues.length > 0 || invalidKeys.length > 0) && (
                <div className="te-validation-panel">
                    <div className="te-validation-header">
                        <i className="fas fa-exclamation-circle" />
                        <span>مشاكل يجب إصلاحها قبل الحفظ</span>
                    </div>
                    <div className="te-validation-items">
                        {forbiddenIssues.map((issue, i) => (
                            <div key={`f-${i}`} className="te-validation-item te-validation-error">
                                <i className="fas fa-ban" />
                                <span>{issue}</span>
                            </div>
                        ))}
                        {invalidKeys.map((k, i) => (
                            <div
                                key={`k-${i}`}
                                className="te-validation-item te-validation-warning"
                                onClick={() => jumpToLine(k.line)}
                                style={{ cursor: "pointer" }}
                                title={`الانتقال إلى السطر ${k.line}`}
                            >
                                <i className="fas fa-key" />
                                <span>
                                    مفتاح غير معتمد: <code>{`{{${k.key}}}`}</code> — السطر {k.line}، العمود {k.column}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

