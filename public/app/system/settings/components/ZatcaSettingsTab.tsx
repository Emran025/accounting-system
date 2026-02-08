"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ZatcaSettings } from "../types";
import { getIcon } from "@/lib/icons";

export function ZatcaSettingsTab() {
    const [settings, setSettings] = useState<ZatcaSettings>({
        zatca_enabled: false,
        zatca_environment: "sandbox",
        zatca_vat_number: "",
        zatca_org_name: "",
        zatca_org_unit_name: "",
        zatca_country_name: "SA",
        zatca_common_name: "",
        zatca_business_category: "",
        zatca_otp: "",
        zatca_csr: "",
        zatca_binary_token: "",
        zatca_secret: "",
        zatca_request_id: "",
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.ZATCA);
            if (response.settings) {
                setSettings(response.settings as ZatcaSettings);
            }
        } catch (error) {
            console.error("Error loading ZATCA settings", error);
            showToast("خطأ في تحميل إعدادات زاتكا", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.ZATCA, {
                method: "PUT",
                body: JSON.stringify(settings),
            });
            showToast("تم حفظ إعدادات زاتكا بنجاح", "success");
        } catch (error) {
            console.error("Error saving ZATCA settings", error);
            showToast("خطأ في حفظ الإعدادات", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOnboard = async () => {
        if (!settings.zatca_otp) {
            showToast("يرجى إدخال رمز OTP من بوابة مطوري زاتكا", "error");
            return;
        }

        try {
            setIsOnboarding(true);
            // In a real scenario, this would call an endpoint that performs CSR generation and CSID request
            // For now, we'll simulate the process as requested "fully controlled"
            const response = await fetchAPI("/api/zatca/onboard", {
                method: "POST",
                body: JSON.stringify({
                    otp: settings.zatca_otp,
                    environment: settings.zatca_environment,
                    csr_data: {
                        common_name: settings.zatca_common_name,
                        org_name: settings.zatca_org_name,
                        org_unit: settings.zatca_org_unit_name,
                        vat_number: settings.zatca_vat_number
                    }
                }),
            });

            if (response.success) {
                showToast("تم إكمال الربط مع زاتكا بنجاح", "success");
                loadSettings();
            } else {
                showToast(response.message || "فشلت عملية الربط", "error");
            }
        } catch (error) {
            console.error("Onboarding error", error);
            showToast("حدث خطأ أثناء عملية الربط", "error");
        } finally {
            setIsOnboarding(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted">جاري تحميل الإعدادات...</div>;
    }

    return (
        <div className="animate-fade">
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-header bg-primary text-white p-4" style={{ borderBottom: 'none' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div style={{ fontSize: '1.5rem', opacity: 0.9 }}>{getIcon("shield-check")}</div>
                        <div>
                            <h3 className="mb-0" style={{ fontWeight: 700 }}>هيئة الزكاة والضريبة والجمارك (ZATCA)</h3>
                            <p className="mb-0 text-white-50" style={{ fontSize: '0.85rem' }}>إعدادات الربط المباشر والامتثال لمتطلبات الفوترة الإلكترونية (المرحلة الثانية)</p>
                        </div>
                    </div>
                </div>
                <div className="card-body p-4 bg-light">
                    <div className="row g-4">
                        <div className="col-12 mb-2">
                            <div className="p-3 bg-white rounded-3 border border-success-subtle d-flex align-items-start gap-3">
                                <Checkbox
                                    id="zatca_enabled"
                                    checked={settings.zatca_enabled}
                                    onChange={(e) => setSettings({ ...settings, zatca_enabled: e.target.checked })}
                                />
                                <div>
                                    <label htmlFor="zatca_enabled" style={{ fontWeight: 600, cursor: 'pointer' }}>تفعيل التكامل المباشر مع زاتكا</label>
                                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>عند التفعيل، سيتم إرسال كل فاتورة يتم إصدارها إلى بوابة زاتكا للاعتماد أو التقرير فورياً.</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group mb-4">
                                <Select
                                    label="بيئة العمل (Environment)"
                                    value={settings.zatca_environment}
                                    onChange={(e) => setSettings({ ...settings, zatca_environment: e.target.value as any })}
                                >
                                    <option value="sandbox">بيئة المطورين (Sandbox)</option>
                                    <option value="simulation">بيئة المحاكاة (Simulation)</option>
                                    <option value="production">البيئة الإنتاجية (Production)</option>
                                </Select>
                                <small className="text-muted d-block mt-1">يُنصح بالبدء في بيئة المطورين للاختبار.</small>
                            </div>

                            <div className="form-group mb-4">
                                <TextInput
                                    label="الرقم الضريبي (VAT Number) *"
                                    value={settings.zatca_vat_number}
                                    onChange={(e) => setSettings({ ...settings, zatca_vat_number: e.target.value })}
                                    placeholder="300XXXXXXXXXXXX"
                                />
                            </div>

                            <div className="form-group mb-4">
                                <TextInput
                                    label="اسم المنشأة بالإنجليزية (Org Name)"
                                    value={settings.zatca_org_name}
                                    onChange={(e) => setSettings({ ...settings, zatca_org_name: e.target.value })}
                                    placeholder="e.g. My Company LTD"
                                />
                            </div>

                            <div className="form-group mb-4">
                                <TextInput
                                    label="اسم الفرع أو الوحدة (Org Unit)"
                                    value={settings.zatca_org_unit_name}
                                    onChange={(e) => setSettings({ ...settings, zatca_org_unit_name: e.target.value })}
                                    placeholder="e.g. Main Branch"
                                />
                            </div>
                        </div>

                        <div className="col-md-6 border-start ps-md-4">
                            <div className="alert alert-warning border-0 shadow-sm mb-4" style={{ borderRadius: '10px' }}>
                                <h5 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{getIcon("info-circle")} عملية الربط (Onboarding)</h5>
                                <p className="mb-3" style={{ fontSize: '0.85rem' }}>
                                    لإتمام عملية الربط للمرحلة الثانية، يجب الحصول على رمز OTP من بوابة (Fatoora) التابعة لزاتكا.
                                </p>

                                <div className="form-group mb-3">
                                    <TextInput
                                        label="رمز OTP من بوابة زاتكا"
                                        value={settings.zatca_otp}
                                        onChange={(e) => setSettings({ ...settings, zatca_otp: e.target.value })}
                                        placeholder="أدخل الرمز المكون من 6 أرقام"
                                    />
                                </div>

                                <button
                                    className="btn btn-warning w-100"
                                    onClick={handleOnboard}
                                    disabled={isOnboarding || !settings.zatca_otp}
                                >
                                    {isOnboarding ? <i className="fas fa-spinner fa-spin me-2"></i> : getIcon("sync")}
                                    بدء عملية الربط الفنّي
                                </button>
                            </div>

                            {settings.zatca_request_id && (
                                <div className="p-3 bg-white rounded-3 border border-dashed text-center">
                                    <div className="badge bg-success mb-2">النظام مرتبط</div>
                                    <p className="mb-1" style={{ fontSize: '0.8rem' }}>رقم الطلب: <code>{settings.zatca_request_id}</code></p>
                                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>تم الحصول على شهادة الأمان الرقمية بنجاح.</p>
                                </div>
                            )}
                        </div>

                        <div className="col-12 mt-4 d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary px-4" onClick={loadSettings}>
                                {getIcon("undo")} تراجع
                            </button>
                            <button className="btn btn-primary px-4" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <i className="fas fa-spinner fa-spin me-2"></i> : getIcon("save")}
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">الامتثال الفني</h5>
                            <p className="text-secondary small">يتوافق النظام تماماً مع متطلبات المرحلة الثانية (الربط والتكامل) بما في ذلك:</p>
                            <ul className="small text-secondary ps-3">
                                <li>توليد الملفات بصيغة UBL 2.1 XML.</li>
                                <li>التوقيع الرقمي باستخدام شهادات (X509).</li>
                                <li>تشفير البيانات والتحقق من التجزئة (Hashing).</li>
                                <li>دعم فواتير الضريبة المبسطة والضريبة القياسية.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card h-100 shadow-sm">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">بيانات الشهادة الرقمية</h5>
                            <div className="bg-dark text-light p-3 rounded small" style={{ fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto' }}>
                                {settings.zatca_binary_token ? `SECURITY-TOKEN: ${settings.zatca_binary_token.substring(0, 30)}...` : 'لا توجد شهادة رقمية نشطة حالياً. يرجى إتمام عملية الربط.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
