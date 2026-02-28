"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import type {
    ComplianceProfileEditorProps,
    ComplianceProfile,
    PolicyType,
    TransmissionFormat,
    AuthType,
    SystemKey,
    EditorFormat,
} from "./types";
import { FormatEditor } from "./FormatEditor";
import { validateFormat } from "./utils";
import "./styles.css";

// ── Transmission format options ──
const formatOptions: { value: TransmissionFormat; label: string; icon: string }[] = [
    { value: "json", label: "JSON", icon: "fas fa-brackets-curly" },
    { value: "xml", label: "XML", icon: "fas fa-code" },
    { value: "yml", label: "YML", icon: "fas fa-file-alt" },
    { value: "excel", label: "Excel", icon: "fas fa-file-excel" },
];

// ── Auth type options ──
const authTypeOptions: { value: AuthType; label: string }[] = [
    { value: "none", label: "بدون مصادقة" },
    { value: "bearer", label: "Bearer Token" },
    { value: "basic", label: "Basic Auth" },
    { value: "oauth2", label: "OAuth 2.0" },
    { value: "api_key", label: "API Key" },
];

// ── Default system keys (these would typically be fetched from API) ──
const defaultSystemKeys: SystemKey[] = [
    { key: "invoice_number", label: "رقم الفاتورة", type: "string" },
    { key: "invoice_date", label: "تاريخ الفاتورة", type: "date" },
    { key: "invoice_type", label: "نوع الفاتورة", type: "string" },
    { key: "subtotal", label: "المجموع الفرعي", type: "number" },
    { key: "total_tax", label: "إجمالي الضريبة", type: "number" },
    { key: "grand_total", label: "الإجمالي النهائي", type: "number" },
    { key: "discount_amount", label: "مبلغ الخصم", type: "number" },
    { key: "currency_code", label: "رمز العملة", type: "string" },
    { key: "tax_type_code", label: "رمز نوع الضريبة", type: "string" },
    { key: "tax_rate", label: "نسبة الضريبة", type: "number" },
    { key: "taxable_amount", label: "المبلغ الخاضع", type: "number" },
    { key: "tax_amount", label: "مبلغ الضريبة", type: "number" },
    { key: "tax_authority_code", label: "رمز الجهة الضريبية", type: "string" },
    { key: "seller_name", label: "اسم البائع", type: "string" },
    { key: "seller_vat_number", label: "الرقم الضريبي للبائع", type: "string" },
    { key: "seller_cr_number", label: "السجل التجاري للبائع", type: "string" },
    { key: "seller_address", label: "عنوان البائع", type: "string" },
    { key: "buyer_name", label: "اسم المشتري", type: "string" },
    { key: "buyer_vat_number", label: "الرقم الضريبي للمشتري", type: "string" },
    { key: "buyer_address", label: "عنوان المشتري", type: "string" },
    { key: "item_name", label: "اسم الصنف", type: "string" },
    { key: "item_quantity", label: "الكمية", type: "number" },
    { key: "item_unit_price", label: "سعر الوحدة", type: "number" },
    { key: "item_total", label: "إجمالي الصنف", type: "number" },
    { key: "item_tax_amount", label: "ضريبة الصنف", type: "number" },
    { key: "payment_method", label: "طريقة الدفع", type: "string" },
    { key: "payment_date", label: "تاريخ الدفع", type: "date" },
    { key: "payment_reference", label: "مرجع الدفع", type: "string" },
];

/**
 * ComplianceProfileEditor – Main full-screen editor for configuring
 * how tax/compliance data is transmitted to external entities.
 *
 * Supports:
 * - Policy 1 (Push): We send data to entity's endpoint
 * - Policy 2 (Pull): Entity accesses our API with generated token
 * - Transmission format: JSON, XML, YML, Excel
 * - Key mapping + structure editor
 */
export function ComplianceProfileEditor({
    profile,
    authorities,
    onSave,
    onCancel,
    className = "",
}: ComplianceProfileEditorProps) {
    const isNew = !profile;

    // ── Form State ──
    const [name, setName] = useState(profile?.name || "");
    const [code, setCode] = useState(profile?.code || "");
    const [taxAuthorityId, setTaxAuthorityId] = useState<number>(profile?.tax_authority_id || (authorities[0]?.id ?? 0));
    const [policyType, setPolicyType] = useState<PolicyType>(profile?.policy_type || "push");
    const [transmissionFormat, setTransmissionFormat] = useState<TransmissionFormat>(profile?.transmission_format || "json");
    const [keyMapping, setKeyMapping] = useState<Record<string, string>>(profile?.key_mapping || {});
    const [structureTemplate, setStructureTemplate] = useState<string>(profile?.structure_template || "");
    const [isActive, setIsActive] = useState(profile?.is_active ?? true);
    const [notes, setNotes] = useState(profile?.notes || "");

    // Push-specific
    const [endpointUrl, setEndpointUrl] = useState(profile?.endpoint_url || "");
    const [authType, setAuthType] = useState<AuthType>((profile?.auth_type as AuthType) || "none");
    const [authCredentials, setAuthCredentials] = useState(profile?.auth_credentials || "");
    const [httpMethod, setHttpMethod] = useState(profile?.http_method || "POST");
    const [requestHeaders, setRequestHeaders] = useState(profile?.request_headers ? JSON.stringify(profile.request_headers, null, 2) : "");
    const [openApiSpec, setOpenApiSpec] = useState(profile?.openapi_spec ? JSON.stringify(profile.openapi_spec, null, 2) : "");

    // Pull-specific
    const [tokenPreview, setTokenPreview] = useState(profile?.token_preview || "");
    const [rawToken, setRawToken] = useState<string | null>(null); // Full token only after generate
    const [tokenExpiresAt, setTokenExpiresAt] = useState(profile?.token_expires_at || "");
    const [pullEndpointPath, setPullEndpointPath] = useState(profile?.pull_endpoint_path || "");
    const [allowedIps, setAllowedIps] = useState((profile?.allowed_ips || []).join(", "));

    // Editor state
    const [isSaving, setIsSaving] = useState(false);
    const [activeView, setActiveView] = useState<"config" | "editor">("config");

    // ── Editor format (exclude excel from editor) ──
    const editorFormat: EditorFormat = useMemo(
        () => transmissionFormat === "excel" ? "json" : transmissionFormat,
        [transmissionFormat]
    );

    // ── Sync from props ──
    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setCode(profile.code || "");
            setTaxAuthorityId(profile.tax_authority_id || (authorities[0]?.id ?? 0));
            setPolicyType(profile.policy_type || "push");
            setTransmissionFormat(profile.transmission_format || "json");
            setKeyMapping(profile.key_mapping || {});
            setStructureTemplate(profile.structure_template || "");
            setIsActive(profile.is_active ?? true);
            setNotes(profile.notes || "");
            setEndpointUrl(profile.endpoint_url || "");
            setAuthType((profile.auth_type as AuthType) || "none");
            setAuthCredentials(profile.auth_credentials || "");
            setHttpMethod(profile.http_method || "POST");
            setRequestHeaders(profile.request_headers ? JSON.stringify(profile.request_headers, null, 2) : "");
            setOpenApiSpec(profile.openapi_spec ? JSON.stringify(profile.openapi_spec, null, 2) : "");
            setTokenPreview(profile.token_preview || "");
            setRawToken(null);
            setTokenExpiresAt(profile.token_expires_at || "");
            setPullEndpointPath(profile.pull_endpoint_path || "");
            setAllowedIps((profile.allowed_ips || []).join(", "));
        }
    }, [profile, authorities]);

    // ── Save Handler ──
    const handleSave = async () => {
        if (!name.trim()) {
            showToast("اسم الملف التعريفي مطلوب", "error");
            return;
        }
        if (!code.trim()) {
            showToast("الرمز المعرف مطلوب", "error");
            return;
        }
        if (!taxAuthorityId) {
            showToast("يرجى اختيار الجهة الضريبية", "error");
            return;
        }
        if (policyType === "push" && !endpointUrl.trim()) {
            showToast("رابط نقطة النهاية مطلوب للسياسة 1 (الإرسال)", "error");
            return;
        }

        // Validate structure if provided
        if (structureTemplate.trim() && transmissionFormat !== "excel") {
            const validation = validateFormat(structureTemplate, editorFormat);
            if (!validation.valid) {
                showToast("هيكل القالب يحتوي على أخطاء – يرجى إصلاحها أولاً", "error");
                return;
            }
        }

        setIsSaving(true);
        try {
            let parsedOpenApiSpec = null;
            if (openApiSpec.trim()) {
                try {
                    parsedOpenApiSpec = JSON.parse(openApiSpec);
                } catch {
                    showToast("مواصفات OpenAPI غير صالحة (JSON)", "error");
                    setIsSaving(false);
                    return;
                }
            }

            const data: ComplianceProfile = {
                id: profile?.id,
                tax_authority_id: taxAuthorityId,
                name,
                code,
                policy_type: policyType,
                transmission_format: transmissionFormat,
                key_mapping: Object.keys(keyMapping).length > 0 ? keyMapping : null,
                structure_template: structureTemplate.trim() || null,
                // Push fields
                endpoint_url: policyType === "push" ? endpointUrl : null,
                auth_type: policyType === "push" ? authType : null,
                auth_credentials: policyType === "push" ? authCredentials : null,
                request_headers: policyType === "push" && requestHeaders.trim() ? JSON.parse(requestHeaders) : null,
                http_method: policyType === "push" ? httpMethod : "POST",
                openapi_spec: policyType === "push" ? parsedOpenApiSpec : null,
                // Pull fields
                pull_endpoint_path: policyType === "pull" ? pullEndpointPath : null,
                allowed_ips: policyType === "pull" && allowedIps.trim()
                    ? allowedIps.split(",").map(ip => ip.trim()).filter(Boolean)
                    : null,
                // Common
                is_active: isActive,
                notes: notes.trim() || null,
            };

            await onSave(data);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Copy token to clipboard ──
    const handleCopyToken = useCallback(() => {
        if (rawToken) {
            navigator.clipboard.writeText(rawToken);
            showToast("تم نسخ التوكن الكامل", "success");
        } else if (tokenPreview) {
            showToast("التوكن مخفي – أعد إنشاءه للحصول على النسخة الكاملة", "warning");
        }
    }, [rawToken, tokenPreview]);

    // ── Regenerate token ──
    const handleRegenerateToken = useCallback(async () => {
        if (!profile?.id) {
            showToast("يجب حفظ الملف التعريفي أولاً", "warning");
            return;
        }
        const res = await fetchAPI(API_ENDPOINTS.SYSTEM.COMPLIANCE_PROFILES.GENERATE_TOKEN(profile.id), {
            method: "POST",
            body: JSON.stringify({ expires_in_days: 365 }),
        });
        if (res.success) {
            const newToken = (res as Record<string, unknown>).access_token as string || "";
            setRawToken(newToken);
            setTokenPreview(newToken.substring(0, 12) + '••••••••' + newToken.substring(newToken.length - 6));
            setTokenExpiresAt((res as Record<string, unknown>).token_expires_at as string || "");
            showToast("تم إعادة إنشاء التوكن بنجاح – انسخه الآن", "success");
        } else {
            showToast(res.message || "فشل إنشاء التوكن", "error");
        }
    }, [profile?.id]);

    // ── Revoke token ──
    const handleRevokeToken = useCallback(async () => {
        if (!profile?.id) return;
        const res = await fetchAPI(API_ENDPOINTS.SYSTEM.COMPLIANCE_PROFILES.REVOKE_TOKEN(profile.id), {
            method: "POST",
        });
        if (res.success) {
            setTokenPreview("");
            setRawToken(null);
            setTokenExpiresAt("");
            showToast("تم إلغاء التوكن", "success");
        } else {
            showToast(res.message || "فشل إلغاء التوكن", "error");
        }
    }, [profile?.id]);

    // ── Build pull endpoint display ──
    const pullEndpoint = useMemo(() => {
        const base = pullEndpointPath || "compliance-data";
        return `/api/compliance-pull/${code || "CODE"}/${base}`;
    }, [code, pullEndpointPath]);

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className={`compliance-editor ${className}`}>
            {/* ── Top Bar ── */}
            <div className="ce-topbar">
                <div className="ce-topbar-right">
                    <div className="ce-topbar-title">
                        <i className="fas fa-shield-alt" />
                        <span>
                            {isNew
                                ? "إنشاء ملف تعريف الامتثال"
                                : `تعديل: ${profile?.name || ""}`}
                        </span>
                    </div>
                    <div className="ce-status-badges">
                        <span className={`ce-badge ce-badge-${policyType}`}>
                            <i className={`fas fa-${policyType === "push" ? "paper-plane" : "download"}`} />
                            {policyType === "push" ? "سياسة 1: إرسال" : "سياسة 2: استقبال"}
                        </span>
                        <span className="ce-badge ce-badge-format">
                            <i className="fas fa-file-code" />
                            {transmissionFormat.toUpperCase()}
                        </span>
                        <span className={`ce-badge ${isActive ? "ce-badge-active" : "ce-badge-inactive"}`}>
                            <i className={`fas fa-${isActive ? "check-circle" : "times-circle"}`} />
                            {isActive ? "نشط" : "غير نشط"}
                        </span>
                    </div>
                </div>
                <div className="ce-topbar-actions">
                    <Button size="sm" variant="secondary" icon="times" onClick={onCancel}>إلغاء</Button>
                    <Button
                        size="sm"
                        variant="primary"
                        icon="save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "جاري الحفظ..." : isNew ? "إنشاء" : "حفظ التعديلات"}
                    </Button>
                </div>
            </div>

            {/* ── View Toggle ── */}
            <div className="ce-editor-tabs" style={{ background: "#111421" }}>
                <div className="ce-editor-tabs-left">
                    <button
                        className={`ce-tab ${activeView === "config" ? "active" : ""}`}
                        onClick={() => setActiveView("config")}
                    >
                        <i className="fas fa-cog" /> الإعدادات
                    </button>
                    <button
                        className={`ce-tab ${activeView === "editor" ? "active" : ""}`}
                        onClick={() => setActiveView("editor")}
                    >
                        <i className="fas fa-code" /> محرر الهيكل
                    </button>
                </div>
                <div className="ce-editor-tabs-right">
                    {activeView === "editor" && (
                        <span style={{ fontSize: 11, color: "#8890a4", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="fas fa-info-circle" style={{ color: "#6c8cff" }} />
                            استخدم {"{{key}}"} لإدراج مفتاح نظام
                        </span>
                    )}
                </div>
            </div>

            {/* ══════════════ CONFIG VIEW ══════════════ */}
            {activeView === "config" && (
                <div style={{ flex: 1, overflow: "auto", background: "#0f1117" }}>
                    <div className="ce-config-panel" style={{ borderBottom: "none" }}>
                        {/* ── Basic Info ── */}
                        <div className="ce-config-section-label">
                            <i className="fas fa-info-circle" /> المعلومات الأساسية
                        </div>
                        <div className="ce-config-row">
                            <div className="ce-field">
                                <label>اسم الملف التعريفي *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="مثال: تقرير هيئة الزكاة"
                                    className="ce-input"
                                />
                            </div>
                            <div className="ce-field">
                                <label>الرمز المعرف *</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                                    placeholder="ZATCA_VAT_PUSH"
                                    className="ce-input"
                                    disabled={!isNew}
                                    style={{ direction: "ltr", textAlign: "left" }}
                                />
                            </div>
                            <div className="ce-field">
                                <label>الجهة الضريبية *</label>
                                <select
                                    value={taxAuthorityId}
                                    onChange={(e) => setTaxAuthorityId(Number(e.target.value))}
                                    className="ce-select"
                                >
                                    {authorities.map(auth => (
                                        <option key={auth.id} value={auth.id}>{auth.name} ({auth.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ce-field" style={{ minWidth: 100, flex: "0 0 auto" }}>
                                <label>الحالة</label>
                                <select
                                    value={isActive ? "1" : "0"}
                                    onChange={(e) => setIsActive(e.target.value === "1")}
                                    className="ce-select"
                                >
                                    <option value="1">نشط</option>
                                    <option value="0">غير نشط</option>
                                </select>
                            </div>
                        </div>

                        {/* ── Policy Selection ── */}
                        <div className="ce-config-section-label" style={{ marginTop: 4 }}>
                            <i className="fas fa-route" /> نوع السياسة
                        </div>
                        <div className="ce-config-row">
                            <div className="ce-policy-toggle">
                                <button
                                    className={`ce-policy-option ${policyType === "push" ? "active push" : ""}`}
                                    onClick={() => setPolicyType("push")}
                                    type="button"
                                >
                                    <i className="fas fa-paper-plane ce-policy-icon" />
                                    <span className="ce-policy-label">سياسة 1: الإرسال (Push)</span>
                                    <span className="ce-policy-desc">
                                        نظامنا يرسل البيانات تلقائياً إلى نقطة النهاية الخاصة بالجهة
                                    </span>
                                </button>
                                <button
                                    className={`ce-policy-option ${policyType === "pull" ? "active pull" : ""}`}
                                    onClick={() => setPolicyType("pull")}
                                    type="button"
                                >
                                    <i className="fas fa-download ce-policy-icon" />
                                    <span className="ce-policy-label">سياسة 2: الاستقبال (Pull)</span>
                                    <span className="ce-policy-desc">
                                        الجهة تصل إلى بياناتنا عبر API وتوكن أمان مُولَّد
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* ── Format Selection ── */}
                        <div className="ce-config-section-label">
                            <i className="fas fa-file-export" /> صيغة الإرسال
                        </div>
                        <div className="ce-config-row">
                            <div className="ce-field-full">
                                <div className="ce-format-selector">
                                    {formatOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            className={`ce-format-chip ${transmissionFormat === opt.value ? "active" : ""}`}
                                            onClick={() => setTransmissionFormat(opt.value)}
                                            type="button"
                                        >
                                            <i className={opt.icon} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Push-specific Config ── */}
                        {policyType === "push" && (
                            <>
                                <div className="ce-config-section-label" style={{ marginTop: 4 }}>
                                    <i className="fas fa-server" /> إعدادات الإرسال (Push)
                                </div>
                                <div className="ce-config-row">
                                    <div className="ce-field ce-field-wide">
                                        <label>رابط نقطة النهاية (Endpoint URL) *</label>
                                        <input
                                            type="url"
                                            value={endpointUrl}
                                            onChange={(e) => setEndpointUrl(e.target.value)}
                                            placeholder="https://api.entity.gov/v1/submit"
                                            className="ce-input"
                                            style={{ direction: "ltr", textAlign: "left" }}
                                        />
                                    </div>
                                    <div className="ce-field" style={{ minWidth: 120, flex: "0 0 auto" }}>
                                        <label>HTTP Method</label>
                                        <select
                                            value={httpMethod}
                                            onChange={(e) => setHttpMethod(e.target.value)}
                                            className="ce-select"
                                        >
                                            <option value="POST">POST</option>
                                            <option value="PUT">PUT</option>
                                            <option value="PATCH">PATCH</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="ce-config-row">
                                    <div className="ce-field">
                                        <label>نوع المصادقة</label>
                                        <select
                                            value={authType}
                                            onChange={(e) => setAuthType(e.target.value as AuthType)}
                                            className="ce-select"
                                        >
                                            {authTypeOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {authType !== "none" && (
                                        <div className="ce-field ce-field-wide">
                                            <label>بيانات المصادقة</label>
                                            <input
                                                type="password"
                                                value={authCredentials}
                                                onChange={(e) => setAuthCredentials(e.target.value)}
                                                placeholder={
                                                    authType === "bearer" ? "Bearer token..." :
                                                        authType === "basic" ? "username:password" :
                                                            authType === "api_key" ? "API Key..." :
                                                                "Credentials..."
                                                }
                                                className="ce-input"
                                                style={{ direction: "ltr", textAlign: "left" }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="ce-config-row">
                                    <div className="ce-field-full">
                                        <label>رؤوس HTTP إضافية (اختياري – JSON)</label>
                                        <textarea
                                            value={requestHeaders}
                                            onChange={(e) => setRequestHeaders(e.target.value)}
                                            placeholder='{"X-Custom-Header": "value", "Accept-Language": "ar"}'
                                            className="ce-textarea"
                                            rows={3}
                                            style={{ direction: "ltr", textAlign: "left" }}
                                        />
                                    </div>
                                </div>
                                <div className="ce-config-row">
                                    <div className="ce-field-full">
                                        <label>مواصفات OpenAPI (اختياري – JSON)</label>
                                        <textarea
                                            value={openApiSpec}
                                            onChange={(e) => setOpenApiSpec(e.target.value)}
                                            placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                                            className="ce-textarea"
                                            rows={4}
                                            style={{ direction: "ltr", textAlign: "left" }}
                                        />
                                        <span style={{ fontSize: 10, color: "#6c8cff", marginTop: 2 }}>
                                            <i className="fas fa-info-circle" style={{ marginLeft: 4 }} />
                                            عند تقديم مواصفات OpenAPI، سيقوم النظام بتحويل البيانات تلقائياً إلى الصيغة المطلوبة
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Pull-specific Config ── */}
                        {policyType === "pull" && (
                            <>
                                <div className="ce-config-section-label" style={{ marginTop: 4 }}>
                                    <i className="fas fa-key" /> إعدادات الاستقبال (Pull)
                                </div>
                                <div className="ce-config-row">
                                    <div className="ce-field">
                                        <label>مسار نقطة النهاية</label>
                                        <input
                                            type="text"
                                            value={pullEndpointPath}
                                            onChange={(e) => setPullEndpointPath(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                                            placeholder="compliance-data"
                                            className="ce-input"
                                            style={{ direction: "ltr", textAlign: "left" }}
                                        />
                                    </div>
                                    <div className="ce-field ce-field-wide">
                                        <label>عناوين IP المسموحة (اختياري، مفصولة بفاصلة)</label>
                                        <input
                                            type="text"
                                            value={allowedIps}
                                            onChange={(e) => setAllowedIps(e.target.value)}
                                            placeholder="192.168.1.1, 10.0.0.0/24"
                                            className="ce-input"
                                            style={{ direction: "ltr", textAlign: "left" }}
                                        />
                                    </div>
                                </div>

                                {/* Endpoint Preview */}
                                <div className="ce-config-row">
                                    <div className="ce-field-full">
                                        <label>نقطة النهاية للجهة</label>
                                        <div className="ce-endpoint-info">
                                            <span className="ce-method-badge">GET</span>
                                            <code>{pullEndpoint}</code>
                                        </div>
                                    </div>
                                </div>

                                {/* Token Display */}
                                <div className="ce-config-row">
                                    <div className="ce-field-full">
                                        <label>توكن الوصول</label>
                                        <div className="ce-token-display">
                                            {(tokenPreview || rawToken) ? (
                                                <>
                                                    <div className="ce-token-value">
                                                        <code>{rawToken || tokenPreview}</code>
                                                        <button className="ce-token-copy" onClick={handleCopyToken}>
                                                            <i className="fas fa-copy" /> {rawToken ? "نسخ" : "مخفي"}
                                                        </button>
                                                    </div>
                                                    {rawToken && (
                                                        <div style={{ fontSize: 10, color: "#f59e0b", margin: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>
                                                            <i className="fas fa-exclamation-triangle" />
                                                            هذا التوكن يظهر مرة واحدة فقط – انسخه الآن
                                                        </div>
                                                    )}
                                                    <div className="ce-token-meta">
                                                        {tokenExpiresAt && (
                                                            <span>
                                                                <i className="fas fa-clock" />
                                                                ينتهي: {new Date(tokenExpiresAt).toLocaleDateString("ar-SA")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="ce-token-actions">
                                                        <button className="ce-token-btn generate" onClick={handleRegenerateToken}>
                                                            <i className="fas fa-sync" /> إعادة إنشاء
                                                        </button>
                                                        <button className="ce-token-btn revoke" onClick={handleRevokeToken}>
                                                            <i className="fas fa-ban" /> إلغاء التوكن
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ textAlign: "center", padding: "12px 0" }}>
                                                    <span style={{ color: "#8890a4", fontSize: 12 }}>
                                                        لم يتم إنشاء توكن بعد. سيتم إنشاء توكن تلقائياً عند الحفظ.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Notes ── */}
                        <div className="ce-config-section-label" style={{ marginTop: 4 }}>
                            <i className="fas fa-sticky-note" /> ملاحظات
                        </div>
                        <div className="ce-config-row" style={{ paddingBottom: 20 }}>
                            <div className="ce-field-full">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="ملاحظات إضافية حول هذا الملف التعريفي..."
                                    className="ce-textarea"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ STRUCTURE EDITOR VIEW ══════════════ */}
            {activeView === "editor" && (
                <FormatEditor
                    format={editorFormat}
                    systemKeys={defaultSystemKeys}
                    keyMapping={keyMapping}
                    structureTemplate={structureTemplate}
                    onKeyMappingChange={setKeyMapping}
                    onStructureChange={setStructureTemplate}
                />
            )}
        </div>
    );
}
