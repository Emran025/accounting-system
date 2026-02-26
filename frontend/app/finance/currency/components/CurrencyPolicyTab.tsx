"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Alert } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { CurrencyPolicy } from "../types";

export function CurrencyPolicyTab() {
    const [policies, setPolicies] = useState<CurrencyPolicy[]>([]);
    const [loadingPolicy, setLoadingPolicy] = useState(true);
    const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: "primary" | "danger";
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        variant: "primary"
    });

    const loadData = useCallback(async () => {
        setLoadingPolicy(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.BASE);
            if (res.success) {
                const pols = res.data as CurrencyPolicy[];
                setPolicies(pols);
                const active = pols.find(p => p.is_active);
                if (active) setSelectedPolicyId(active.id);
            }
        } catch (e) {
            console.error(e);
            showToast("خطأ في تحميل السياسات المالية", "error");
        } finally {
            setLoadingPolicy(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleActivatePolicy = async () => {
        if (!selectedPolicyId) return;

        setConfirmDialog({
            isOpen: true,
            title: "تأكيد تغيير السياسة",
            message: "هل أنت متأكد من تغيير سياسة العملات؟ قد يؤثر هذا على كيفية معالجة المعاملات الجديدة.",
            variant: "primary",
            onConfirm: async () => {
                try {
                    const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.ACTIVATE(selectedPolicyId), { method: "POST" });
                    if (res.success) {
                        showToast("تم تفعيل السياسة بنجاح", "success");
                        loadData(); // Reload to refresh status
                    } else {
                        showToast(res.message || "فشل تفعيل السياسة", "error");
                    }
                } catch (e) {
                    showToast("خطأ في الاتصال", "error");
                }
            }
        });
    };

    return (
        <div className="sales-card animate-fade">
            {/* Header Section */}
            <div className="card-header-flex">
                <div className="title-with-icon">
                    <h3 style={{ margin: 0 }}>سياسة الحوكمة المالية</h3>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleActivatePolicy}
                    disabled={!selectedPolicyId || policies.find(p => p.id === selectedPolicyId)?.is_active}
                >
                    <i className="fas fa-save"></i>
                    حفظ واعتماد السياسة
                </button>
            </div>

            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                حدد السياسة التي يتبعها النظام في معالجة العملات الأجنبية وقيود اليومية.
            </p>

            {/* Loading State */}
            {loadingPolicy ? (
                <div className="empty-state" style={{ minHeight: '200px' }}>
                    <div className="btn-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderColor: 'var(--border-color)', borderTopColor: 'var(--primary-color)' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل السياسات المالية...</p>
                </div>
            ) : policies.length === 0 ? (
                /* Empty State */
                <div className="empty-state" style={{ minHeight: '250px', background: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)' }}>
                    <i className="fas fa-folder-open" style={{ fontSize: '2.5rem' }}></i>
                    <h3>لا توجد سياسات متاحة</h3>
                    <p>لم يتم العثور على أي سياسات مالية معرفة في النظام. يرجى التأكد من تشغيل البيانات الأولية (Seeders).</p>
                </div>
            ) : (
                /* Policies List */
                <div className="roles-list" style={{ padding: 0, maxHeight: 'none', overflow: 'visible' }}>
                    {policies.map(policy => {
                        const isSelected = selectedPolicyId === policy.id;
                        const isActive = policy.is_active;

                        return (
                            <div
                                key={policy.id}
                                onClick={() => setSelectedPolicyId(policy.id)}
                                className={`role-item ${isSelected ? 'active' : ''}`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    marginBottom: '0.75rem'
                                }}
                            >
                                {/* Selection Indicator */}
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    border: `2px solid ${isSelected ? 'white' : 'var(--border-color)'}`,
                                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {isSelected && <i className="fas fa-check" style={{ fontSize: '0.65rem' }}></i>}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="role-info" style={{ marginBottom: '0.75rem' }}>
                                        <h4 style={{
                                            margin: '0 0 0.5rem 0',
                                            fontSize: '1.05rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            {policy.name}
                                            <span className={isSelected ? '' : 'badge-system'} style={{
                                                fontSize: '0.7rem',
                                                fontFamily: 'monospace',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                                background: isSelected ? 'rgba(255,255,255,0.2)' : undefined
                                            }}>
                                                {policy.policy_type}
                                            </span>
                                            {isActive && (
                                                <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fas fa-check-circle"></i> السياسة المطبقة
                                                </span>
                                            )}
                                        </h4>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            opacity: isSelected ? 0.9 : 0.75,
                                            lineHeight: 1.6
                                        }}>
                                            {policy.description}
                                        </p>
                                    </div>

                                    {/* Feature Tags */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span className={`action-checkbox ${policy.allow_multi_currency_balances ? '' : 'disabled'}`} style={{
                                            padding: '0.4rem 0.75rem',
                                            fontSize: '0.75rem',
                                            background: isSelected
                                                ? (policy.allow_multi_currency_balances ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')
                                                : (policy.allow_multi_currency_balances ? 'var(--primary-subtle)' : 'var(--bg-color)'),
                                            borderColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                                            color: isSelected ? 'white' : undefined
                                        }}>
                                            <i className={`fas ${policy.allow_multi_currency_balances ? 'fa-check' : 'fa-times'}`} style={{ fontSize: '0.7rem' }}></i>
                                            أرصدة متعددة العملات
                                        </span>

                                        <span className={`action-checkbox ${policy.revaluation_enabled ? '' : 'disabled'}`} style={{
                                            padding: '0.4rem 0.75rem',
                                            fontSize: '0.75rem',
                                            background: isSelected
                                                ? (policy.revaluation_enabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')
                                                : (policy.revaluation_enabled ? 'var(--primary-subtle)' : 'var(--bg-color)'),
                                            borderColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                                            color: isSelected ? 'white' : undefined
                                        }}>
                                            <i className={`fas ${policy.revaluation_enabled ? 'fa-check' : 'fa-times'}`} style={{ fontSize: '0.7rem' }}></i>
                                            إعادة تقييم فروقات العملة
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info Alert */}
            <div style={{ marginTop: '1.5rem' }}>
                <Alert
                    type="warning"
                    message="ملاحظة هامة: تغيير السياسة المالية لا يؤثر على القيود السابقة (تُحفظ بنفس السياسة التي أنشئت بها). السياسة الجديدة ستطبق فقط على العمليات التي تتم بعد لحظة التفعيل."
                />
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmVariant={confirmDialog.variant}
                confirmText="تأكيد"
                cancelText="إلغاء"
            />
        </div>
    );
}
