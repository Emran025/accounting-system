"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Dialog, Table, Column, ActionButtons } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Currency, CurrencyDenomination, PolicyStatus } from "../types";
import { getIcon } from "@/lib/icons";
import { Switch } from "@/components/ui/switch";
import { TextInput } from "@/components/ui/TextInput";
import { Input } from "@/components/ui/Input";

export function CurrencyListTab() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
    const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Currency>>({
        code: "",
        name: "",
        symbol: "",
        exchange_rate: 1,
        is_active: true,
        denominations: []
    });

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
        try {
            setLoading(true);
            const [currRes, statusRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE),
                fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.ACTIVE)
            ]);

            if (currRes.success) {
                setCurrencies(currRes.data as Currency[]);
            }
            if (statusRes.success) {
                setPolicyStatus(statusRes.data as PolicyStatus);
            }
        } catch (e) {
            console.error(e);
            showToast("خطأ في تحميل البيانات", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        try {
            const url = editingCurrency
                ? API_ENDPOINTS.FINANCE.CURRENCIES.withId(editingCurrency.id)
                : API_ENDPOINTS.FINANCE.CURRENCIES.BASE;

            const method = editingCurrency ? "PUT" : "POST";

            const res = await fetchAPI(url, {
                method,
                body: JSON.stringify(formData),
            });

            if (res.success) {
                showToast(editingCurrency ? "تم تحديث العملة" : "تم إضافة العملة", "success");
                setIsModalOpen(false);
                loadData();
            } else {
                showToast(res.message || "حدث خطأ", "error");
            }
        } catch (e) {
            showToast("خطأ في الحفظ", "error");
        }
    };

    const handleEdit = (curr: Currency) => {
        setEditingCurrency(curr);
        setFormData({
            code: curr.code,
            name: curr.name,
            symbol: curr.symbol,
            exchange_rate: curr.exchange_rate,
            is_active: curr.is_active,
            denominations: curr.denominations || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: "تأكيد الحذف",
            message: "هل أنت متأكد من حذف هذه العملة؟",
            variant: "danger",
            onConfirm: async () => {
                try {
                    const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.withId(id), { method: "DELETE" });
                    if (res.success) {
                        showToast("تم الحذف بنجاح", "success");
                        loadData();
                    } else {
                        showToast(res.message || "فشل الحذف", "error");
                    }
                } catch {
                    showToast("خطأ في الحذف", "error");
                }
            }
        });
    };

    const handleToggleActive = async (curr: Currency) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.TOGGLE(curr.id), { method: "POST" });
            if (res.success) {
                loadData();
                showToast("تم تحديث الحالة", "success");
            } else {
                showToast(res.message || "فشل التحديث", "error");
            }
        } catch {
            showToast("خطأ في التحديث", "error");
        }
    }

    // Banknotes helper in form
    const addDenomination = () => {
        const currentDenoms = formData.denominations || [];
        setFormData({ ...formData, denominations: [...currentDenoms, { value: 0, label: "" }] });
    };

    const removeDenomination = (index: number) => {
        const currentDenoms = [...(formData.denominations || [])];
        currentDenoms.splice(index, 1);
        setFormData({ ...formData, denominations: currentDenoms });
    };

    const updateDenomination = (index: number, field: keyof CurrencyDenomination, value: any) => {
        const currentDenoms = [...(formData.denominations || [])];
        currentDenoms[index] = { ...currentDenoms[index], [field]: value };
        setFormData({ ...formData, denominations: currentDenoms });
    };

    const columns: Column<Currency>[] = [
        {
            key: "name",
            header: "العملة",
            render: (curr) => (
                <>
                    {curr.name} <span className="text-muted">({curr.code})</span>
                    {curr.is_primary && <span className="badge badge-success-light mr-2">الرئيسية</span>}
                </>
            )
        },
        { key: "symbol", header: "الرمز" },
        {
            key: "exchange_rate",
            header: "سعر الصرف",
            render: (curr) => Number(curr.exchange_rate).toFixed(4)
        },
        {
            key: "is_active",
            header: "الحالة",
            render: (curr) => (
                <Switch
                    checked={curr.is_active}
                    onChange={() => handleToggleActive(curr)}
                    disabled={curr.is_primary}
                />
            )
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (curr) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => handleEdit(curr),
                        },
                        {
                            icon: "trash",
                            title: "حذف",
                            variant: "delete",
                            onClick: () => handleDelete(curr.id),
                        }
                    ]}
                />
            ),
        },
    ];

    const denominationColumns: Column<CurrencyDenomination>[] = [
        {
            key: "value",
            header: "القيمة",
            render: (denom, idx) => (
                <Input
                    type="number"
                    className="form-control form-control-sm"
                    value={denom.value}
                    onChange={e => updateDenomination(idx, 'value', parseFloat(e.target.value))}
                />
            )
        },
        {
            key: "label",
            header: "المسمى (اختياري)",
            render: (denom, idx) => (
                <Input
                    type="text"
                    className="form-control form-control-sm"
                    value={denom.label}
                    onChange={e => updateDenomination(idx, 'label', e.target.value)}
                    placeholder={`${denom.value} ${formData.name || ''}`}
                />
            )
        },
        {
            key: "actions",
            header: "",
            render: (_, idx) => (
                <button className="btn-icon text-danger" onClick={() => removeDenomination(idx)}>
                    {getIcon("trash")}
                </button>
            )
        }
    ];

    return (
        <div className="sales-card animate-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>إعدادات العملات</h3>
                <button className="btn btn-primary" onClick={() => {
                    setEditingCurrency(null);
                    setFormData({ code: "", name: "", symbol: "", exchange_rate: 1, is_active: true, denominations: [] });
                    setIsModalOpen(true);
                }}>
                    <i className="fas fa-plus"></i> إضافة عملة
                </button>
            </div>

            <Table
                data={currencies}
                columns={columns}
                keyExtractor={(item) => item.id}
                isLoading={loading}
            />

            <Dialog
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCurrency ? "تعديل العملة" : "إضافة عملة جديدة"}
                maxWidth="800px"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
                    </>
                }
            >
                <div className="settings-form-grid">
                    <div className="form-group">
                        <TextInput
                            label="اسم العملة"
                            value={formData.name || ""}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <TextInput
                            label="الكود (ISO)"
                            value={formData.code || ""}
                            maxLength={3}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="form-group">
                        <TextInput
                            label="الرمز"
                            value={formData.symbol || ""}
                            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <div>
                            <TextInput
                                label="سعر الصرف (مقابل العملة الرئيسية)"
                                type="number"
                                step="0.0001"
                                value={formData.exchange_rate}
                                onChange={e => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) })}
                                disabled={editingCurrency?.is_primary}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {editingCurrency?.is_primary
                                    ? "لا يمكن تغيير سعر صرف العملة الرئيسية"
                                    : `1 ${formData.code || 'وحدة'} = ${formData.exchange_rate} ${policyStatus?.reference_currency?.code || 'عملة رئيسية'}`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <hr />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h4>الفئات النقدية (Banknotes)</h4>
                    <button className="btn btn-sm btn-secondary" onClick={addDenomination}>
                        <i className="fas fa-plus"></i> إضافة فئة
                    </button>
                </div>

                <div className="denominations-table">
                    <Table
                        columns={denominationColumns}
                        data={formData.denominations || []}
                        keyExtractor={(_, idx) => idx}
                        emptyMessage="لا توجد فئات نقدية مضافة"
                    />
                </div>
            </Dialog>

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
