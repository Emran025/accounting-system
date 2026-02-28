"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Button } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getIcon } from "@/lib/icons";
import { PageSubHeader } from "@/components/layout";
import { TaxAuthority, ZatcaSettings } from "../types";

export function ZatcaSettingsTab() {
    const [authority, setAuthority] = useState<TaxAuthority | null>(null);
    const [config, setConfig] = useState<any>({});

    // UI Helpers
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);

    const loadAuthority = useCallback(async () => {
        try {
            setIsLoading(true);
            const response: any = await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.SETUP);
            if (response.data && response.data.authorities) {
                // Find ZATCA (or fallback to primary)
                const zatca = response.data.authorities.find((a: TaxAuthority) => a.code === 'ZATCA' || a.is_primary);
                if (zatca) {
                    setAuthority(zatca);
                    let parsedConfig: any = {};
                    try { parsedConfig = typeof zatca.config === 'string' ? JSON.parse(zatca.config) : zatca.config || {}; } catch { }
                    setConfig({
                        zatca_environment: parsedConfig.zatca_environment || "sandbox",
                        zatca_vat_number: parsedConfig.zatca_vat_number || "",
                        zatca_org_name: parsedConfig.zatca_org_name || "",
                        zatca_org_unit_name: parsedConfig.zatca_org_unit_name || "",
                        zatca_common_name: parsedConfig.zatca_common_name || "",
                        zatca_otp: parsedConfig.zatca_otp || "",
                        zatca_request_id: parsedConfig.zatca_request_id || "",
                        zatca_binary_token: parsedConfig.zatca_binary_token || ""
                    });
                }
            }
        } catch (error) {
            console.error("Error loading Tax Authority setup", error);
            showToast("خطأ في تحميل إعدادات هيئة الضرائب والزكاة", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAuthority();
    }, [loadAuthority]);

    const handleSave = async () => {
        if (!authority) return;

        try {
            setIsSaving(true);

            // Re-map internal connection token state
            const payload = {
                is_active: authority.is_active,
                connection_type: authority.connection_type,
                endpoint_url: authority.endpoint_url || "",
                connection_credentials: authority.connection_credentials || "",
                config: config // Will auto-cast via eloquent
            };

            await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.AUTHORITIES.UPDATE(authority.id), {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            showToast("تم حفظ سياسة الوصول الفني للهيئة بنجاح", "success");
            loadAuthority();
        } catch (error) {
            console.error("Error saving authority framework data.", error);
            showToast("حدث خطأ في تحديث البيانات. يرجى مراجعة الصلاحيات.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOnboard = async () => {
        if (!config.zatca_otp) {
            showToast("يرجى إدخال رمز OTP من بوابة المطوّرين أو Fatoora", "error");
            return;
        }

        try {
            setIsOnboarding(true);
            const response: any = await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.ZATCA + '/onboard', {
                method: "POST", // Needs a real adapter mapping in future steps
                body: JSON.stringify({
                    otp: config.zatca_otp,
                    environment: config.zatca_environment,
                    csr_data: {
                        common_name: config.zatca_common_name,
                        org_name: config.zatca_org_name,
                        org_unit: config.zatca_org_unit_name,
                        vat_number: config.zatca_vat_number
                    }
                }),
            });

            if (response.success) {
                showToast("تم إكمال الربط الأمني/الفني للهيئة بنجاح! تم التقاط التوكن.", "success");
                loadAuthority(); // Reload to snatch the updated config
            } else {
                showToast(response.message || "فشلت عملية الربط مع خوادم الحكومة.", "error");
            }
        } catch (error) {
            console.error("Onboarding logic execution error:", error);
            showToast("بيانات الاعتماد مرفوضة من الهيئة. الاتصال مغلق.", "error");
        } finally {
            setIsOnboarding(false);
        }
    };

    if (isLoading) {
        return <div className="empty-state"><p>جارٍ إنشاء قنوات الاتصال بمحرك الضرائب الأساسي (Tax Engine)...</p></div>;
    }

    if (!authority) {
        return <div className="empty-state"><p>عذراً، لم يتم العثور على أي سلطة ضريبية نشطة (Tax Authority) في النظام. يرجى تكوين خادم الضرائب في الخلفية.</p></div>;
    }

    return (
        <div className="animate-fade">
            <PageSubHeader
                title={`سياسات الاتصال والامتثال: ${authority.name} (${authority.code})`}
                titleIcon="shield-check"
                actions={
                    <div className="action-buttons">
                        <Button variant="secondary" onClick={loadAuthority} icon="undo">الإلغاء (Reload)</Button>
                        <Button variant="primary" onClick={handleSave} icon="save" isLoading={isSaving}>حفظ سياسات الوصول</Button>
                    </div>
                }
            />

            <div className="alert alert-info">
                <i className="fa-solid fa-lock me-2 ms-2"></i>
                <strong>نظام الحماية والأمان الجمركي العالمي:</strong>
                لا يُسمح بإعطاء الوصول لقواعد البيانات بشكل مباشر. يجب اختيار نوع الاتصال "Push API" (דفع البيانات وتوقيعها للحكومة) أو سياسات "Pull" حسب موافقات الأمن السيبراني.
            </div>

            <div className="form-group checkbox-group my-3">
                <Checkbox
                    id="is_active"
                    label={`تفعيل الارتباط والتكامل الفعّال مع هيئة ${authority.code}`}
                    checked={authority.is_active}
                    onChange={(e) => setAuthority({ ...authority, is_active: e.target.checked })}
                />
                <small className="text-muted">تفعيل هذا الخيار سيطبق الضرائب والرسوم التابعة لهذه السلطة أثناء معالجة الفواتير، ويُفعّل بوابات الاتصال.</small>
            </div>

            <div className="sales-card">
                <h3><i className="fa-solid fa-network-wired me-2 ms-2"></i>سياسة الربط الخارجي</h3>
                <div className="row mt-3">
                    <div className="col-md-6 form-group">
                        <Select
                            label="بروتوكول التكامل (Integration Strategy)"
                            value={authority.connection_type || 'none'}
                            onChange={(e) => setAuthority({ ...authority, connection_type: e.target.value as any })}
                            options={[
                                { value: "none", label: "بدون ربط (داخلي فقط) / Offline" },
                                { value: "push_api", label: "التوقيع وإرسال XML للحكومة (ZATCA Model)" },
                                { value: "pull_key", label: "منح كود للوكالة لسحب البيانات محلياً" }
                            ]}
                        />
                    </div>
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="الخوادم الطرفية الحكومية (Endpoint URL)"
                            value={authority.endpoint_url || ''}
                            onChange={(e) => setAuthority({ ...authority, endpoint_url: e.target.value })}
                            placeholder="https://gw-fatoora.zatca.gov.sa/e-invoicing"
                        />
                    </div>
                </div>

                {authority.connection_type !== 'none' && (
                    <div className="form-row border-top pt-3 mt-2">
                        <div className="form-group w-100">
                            <TextInput
                                label="بيانات الاعتماد الأمنية الخام (Secret Key / OAuth / Token) [Encrypted In DB]"
                                value={authority.connection_credentials || ''}
                                type="password"
                                onChange={(e) => setAuthority({ ...authority, connection_credentials: e.target.value })}
                                placeholder="مخفي آلياً... اتركه فارغاً للاحتفاظ بالقيمة القديمة."
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="sales-card compact">
                <h3>{getIcon("info-circle")} بيانات الاعتماد (الرقم الضريبي وتفاصيل الشهادات للمرحلة 2)</h3>

                <div className="row mt-3">
                    <div className="col-md-6 form-group">
                        <Select
                            label="بيئة العمل الرسمية (Environment)"
                            value={config.zatca_environment}
                            onChange={(e) => setConfig({ ...config, zatca_environment: e.target.value })}
                            options={[
                                { value: "sandbox", label: "بيئة المطورين والاختبار (Sandbox)" },
                                { value: "simulation", label: "بيئة المحاكاة للحكومة (Simulation)" },
                                { value: "production", label: "البيئة الإنتاجية الحية والمراقبة (Production)" }
                            ]}
                        />
                    </div>
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="الرقم الضريبي للمنشأة (VAT Number) *"
                            value={config.zatca_vat_number}
                            onChange={(e) => setConfig({ ...config, zatca_vat_number: e.target.value })}
                            placeholder="310XXXXXXXXXXXXX"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="اسم المنشأة/الشركة بالإنجليزية (Organisation Name) *"
                            value={config.zatca_org_name}
                            onChange={(e) => setConfig({ ...config, zatca_org_name: e.target.value })}
                            placeholder="e.g. My Global Co Ltd"
                        />
                    </div>
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="اسم النظام/الفرع (Common Name/Unit) *"
                            value={config.zatca_org_unit_name}
                            onChange={(e) => setConfig({ ...config, zatca_org_unit_name: e.target.value })}
                            placeholder="Riyadh Branch / IT"
                        />
                    </div>
                </div>

                <div className="alert alert-secondary mt-3">
                    <h5 className="mb-2"><i className="fa-solid fa-key text-warning me-2 ms-2"></i>استخراج شهادة الربط (CSR & OTP)</h5>
                    <p className="text-muted mb-3">للربط الصارم مع بروتوكولات الحكومة، صرّح بالنظام عبر إدخال رمز OTP صالح ليتم تسجيله بخادم الضرائب وتوليد الشهادات الرقمية للتوقيع (Binary Security Token).</p>

                    <div className="row align-items-end">
                        <div className="col-md-8 form-group mb-0">
                            <TextInput
                                label="رمز التفعيل (OTP) من بوابة الفوترة"
                                value={config.zatca_otp}
                                onChange={(e) => setConfig({ ...config, zatca_otp: e.target.value })}
                                placeholder="123456"
                            />
                        </div>
                        <div className="col-md-4">
                            <Button
                                onClick={handleOnboard}
                                variant="primary"
                                icon="link"
                                isLoading={isOnboarding}
                                className="w-100"
                            >
                                طلب اتصال آمن (Onboard)
                            </Button>
                        </div>
                    </div>
                </div>

                {config.zatca_binary_token && (
                    <div className="summary-stat-box mt-3">
                        <div className="stat-item">
                            <span className="stat-label">حالة الشهادة الأمنية وتخزين المفاتيح</span>
                            <span className="badge badge-success mt-1"><i className="fa-solid fa-check mx-1"></i>Token Acquired - Secure</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">الرقم المرجعي للشهادة (Request ID)</span>
                            <code className="stat-value text-muted">{config.zatca_request_id || "N/A"}</code>
                        </div>
                    </div>
                )}
            </div>

            <div className="invoice-info bg-light">
                <div className="info-row">
                    <span className="label fw-bold"><i className="fa-solid fa-code-merge me-2 ms-2 text-primary"></i>تأكيد الامتثال للالتزامات الحكومية</span>
                </div>
                <div className="info-row text-secondary">
                    <span>✓</span> <span className="value ms-2 ps-2 border-end">توحيد كامل بقاعدة واحدة لتجنب تجزئة الضرائب</span>
                </div>
                <div className="info-row text-secondary">
                    <span>✓</span> <span className="value ms-2 ps-2 border-end">التوقيع المحلي قبل الضخ للـ API الحكومي (Push Mode)</span>
                </div>
                <div className="info-row text-secondary">
                    <span>✓</span> <span className="value ms-2 ps-2 border-end">منع الوصول المباشر لقواعد البيانات للحماية ضد الثغرات (Zero DB Access)</span>
                </div>
            </div>
        </div>
    );
}
