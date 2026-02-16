"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Button } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ZatcaSettings } from "../types";
import { getIcon } from "@/lib/icons";
import { PageSubHeader } from "@/components/layout";

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
        return <div className="empty-state"><p>جاري تحميل الإعدادات...</p></div>;
    }

    return (
        <div className="animate-fade">
            <PageSubHeader
                title="إعدادات هيئة الزكاة والضريبة والجمارك (ZATCA)"
                titleIcon="shield-check"
                actions={
                    <div className="action-buttons">
                        <Button variant="secondary" onClick={loadSettings} icon="undo">
                            تراجع
                        </Button>
                        <Button variant="primary" onClick={handleSave} icon="save" isLoading={isSaving}>
                            حفظ الإعدادات
                        </Button>
                    </div>
                }
            />

            <div className="form-group checkbox-group">
                <Checkbox
                    id="zatca_enabled"
                    label="تفعيل التكامل المباشر مع زاتكا"
                    checked={settings.zatca_enabled}
                    onChange={(e) => setSettings({ ...settings, zatca_enabled: e.target.checked })}
                />
                <small className="text-muted">عند التفعيل، سيتم إرسال كل فاتورة يتم إصدارها إلى بوابة زاتكا للاعتماد أو التقرير فورياً.</small>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Select
                        label="بيئة العمل (Environment)"
                        value={settings.zatca_environment}
                        onChange={(e) => setSettings({ ...settings, zatca_environment: e.target.value as any })}
                        options={[
                            { value: "sandbox", label: "بيئة المطورين (Sandbox)" },
                            { value: "simulation", label: "بيئة المحاكاة (Simulation)" },
                            { value: "production", label: "البيئة الإنتاجية (Production)" }
                        ]}
                    />
                </div>
                <div className="form-group">
                    <TextInput
                        label="الرقم الضريبي (VAT Number) *"
                        value={settings.zatca_vat_number}
                        onChange={(e) => setSettings({ ...settings, zatca_vat_number: e.target.value })}
                        placeholder="300XXXXXXXXXXXX"
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <TextInput
                        label="اسم المنشأة بالإنجليزية (Org Name) *"
                        value={settings.zatca_org_name}
                        onChange={(e) => setSettings({ ...settings, zatca_org_name: e.target.value })}
                        placeholder="e.g. My Company LTD"
                    />
                </div>
                <div className="form-group">
                    <TextInput
                        label="اسم الفرع أو الوحدة (Org Unit)"
                        value={settings.zatca_org_unit_name}
                        onChange={(e) => setSettings({ ...settings, zatca_org_unit_name: e.target.value })}
                        placeholder="e.g. Main Branch"
                    />
                </div>
            </div>

            <div className="sales-card compact">
                <h3>{getIcon("info-circle")} عملية الربط (Onboarding)</h3>
                <p className="text-muted">لإتمام عملية الربط للمرحلة الثانية، يجب الحصول على رمز OTP من بوابة (Fatoora) التابعة لزاتكا.</p>

                <div className="form-row">
                    <div className="form-group">
                        <TextInput
                            label="رمز OTP من بوابة زاتكا"
                            value={settings.zatca_otp}
                            onChange={(e) => setSettings({ ...settings, zatca_otp: e.target.value })}
                            placeholder="أدخل الرمز المكون من 6 أرقام"
                        />
                    </div>
                    <div className="form-group">
                        <Button
                            onClick={handleOnboard}
                            variant="primary"
                            icon="sync"
                            isLoading={isOnboarding}
                            disabled={!settings.zatca_otp}
                        >
                            بدء عملية الربط الفنّي
                        </Button>
                    </div>
                </div>

                {settings.zatca_request_id && (
                    <div className="summary-stat-box">
                        <div className="stat-item">
                            <span className="stat-label">حالة الربط</span>
                            <span className="badge badge-success">النظام مرتبط حالياً</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">رقم الطلب</span>
                            <code className="stat-value">{settings.zatca_request_id}</code>
                        </div>
                    </div>
                )}
            </div>

            <div className="invoice-info">
                <div className="info-row">
                    <span className="label">الامتثال الفني</span>
                </div>
                <div className="info-row">
                    <span className="badge badge-success">✓</span>
                    <span className="value">توليد الملفات بصيغة UBL 2.1 XML</span>
                </div>
                <div className="info-row">
                    <span className="badge badge-success">✓</span>
                    <span className="value">التوقيع الرقمي باستخدام شهادات (X509)</span>
                </div>
                <div className="info-row">
                    <span className="badge badge-success">✓</span>
                    <span className="value">تشفير البيانات والتحقق من التجزئة (Hashing)</span>
                </div>
            </div>

            {settings.zatca_binary_token && (
                <div className="sales-card compact">
                    <h3>{getIcon("shield-check")} بيانات شهادة الأمان</h3>
                    <code className="text-muted">{settings.zatca_binary_token}</code>
                </div>
            )}
        </div>
    );
}
