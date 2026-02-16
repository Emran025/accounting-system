"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Dialog, ConfirmDialog, Table, Column, ActionButtons, Button } from "@/components/ui";
import { getIcon } from "@/lib/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/useAuthStore";
import { ZatcaSettingsTab } from "./ZatcaSettingsTab";
import { PageSubHeader } from "@/components/layout";


interface GovernmentFee {
    id: number;
    name: string;
    code?: string;
    percentage: number;
    fixed_amount?: number;
    account_id?: number | null;
    account?: {
        id: number;
        account_name: string;
        account_code: string;
    };
    is_active: boolean;
}

interface Account {
    id: number;
    account_name: string;
    account_code: string;
    account_type: string;
}

export function GovernmentFeesTab() {
    const { canAccess } = useAuthStore();
    const [fees, setFees] = useState<GovernmentFee[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subTab, setSubTab] = useState<"fees" | "zatca">("fees");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [editingFee, setEditingFee] = useState<GovernmentFee | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<GovernmentFee>>({
        name: "",
        percentage: 0,
        fixed_amount: 0,
        account_id: null,
        is_active: true
    });

    const loadFees = useCallback(async () => {
        try {
            const response: any = await fetchAPI(API_ENDPOINTS.SYSTEM.GOVERNMENT_FEES.BASE);
            if (response.data && response.data.fees) {
                setFees(response.data.fees);
            }
        } catch (e) {
            console.error(e);
            showToast("خطأ في تحميل البيانات", "error");
        }
    }, []);

    const loadAccounts = useCallback(async () => {
        try {
            const response: any = await fetchAPI(API_ENDPOINTS.FINANCE.ACCOUNTS.BASE);
            if (response.data) {
                // Handle both direct array and wrapped object
                const list = Array.isArray(response.data) ? response.data : (response.data.accounts || []);
                if (Array.isArray(list)) {
                    setAccounts(list.filter((a: any) => a.account_type === 'Liability'));
                }
            }
        } catch (e) {
            console.error("Error loading accounts", e);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([loadFees(), loadAccounts()]);
            setIsLoading(false);
        };
        init();
    }, [loadFees, loadAccounts]);

    const handleOpenDialog = (fee?: GovernmentFee) => {
        if (fee) {
            setEditingFee(fee);
            setFormData({ ...fee });
        } else {
            setEditingFee(null);
            setFormData({
                name: "",
                percentage: 0,
                fixed_amount: 0,
                account_id: accounts.find(a => a.account_code === '2310')?.id || null, // Default to General Fees if found
                is_active: true
            });
        }
        setDialogOpen(true);
    };

    const calculateSample = () => {
        const base = 1000;
        const pct = Number(formData.percentage) || 0;
        const fixed = Number(formData.fixed_amount) || 0;
        return (base * (pct / 100)) + fixed;
    };

    const handleSave = async () => {
        if (!formData.name) {
            showToast("يرجى إدخال الاسم", "error");
            return;
        }

        try {
            const payload = {
                ...formData,
                percentage: Number(formData.percentage),
                fixed_amount: Number(formData.fixed_amount),
            };

            if (editingFee) {
                await fetchAPI(API_ENDPOINTS.SYSTEM.GOVERNMENT_FEES.withId(editingFee.id), {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                showToast("تم التحديث بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.SYSTEM.GOVERNMENT_FEES.BASE, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                showToast("تمت الإضافة بنجاح", "success");
            }
            setDialogOpen(false);
            loadFees();
        } catch (e) {
            showToast("حدث خطأ أثناء الحفظ", "error");
        }
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.GOVERNMENT_FEES.withId(deleteId), { method: "DELETE" });
            showToast("تم الحذف بنجاح", "success");
            loadFees();
        } catch (e) {
            showToast("حدث خطأ أثناء الحذف", "error");
        }
    };

    const feesColumns: Column<GovernmentFee>[] = [
        {
            key: "name",
            header: "الاسم",
        },
        {
            key: "percentage",
            header: "النسبة المئوية",
            render: (fee) => `${fee.percentage}%`,
        },
        {
            key: "fixed_amount",
            header: "مبلغ ثابت",
            render: (fee) => fee.fixed_amount ? fee.fixed_amount.toFixed(2) : '-',
        },
        {
            key: "account",
            header: "حساب الالتزام (GL)",
            render: (fee) => fee.account ? (
                <span className="badge badge-secondary">
                    {fee.account.account_code} - {fee.account.account_name}
                </span>
            ) : '-',
        },
        {
            key: "is_active",
            header: "الحالة",
            render: (fee) => (
                <span className={`badge ${fee.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {fee.is_active ? 'نشط' : 'غير نشط'}
                </span>
            ),
        },
        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => handleOpenDialog(item)
                        },
                        ...(canAccess("settings", "delete") ? [{
                            icon: "trash" as const,
                            title: "حذف",
                            variant: "delete" as const,
                            onClick: () => handleDeleteClick(item.id)
                        }] : [])
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <div className="card-header-flex">
                <div className="discount-type-toggle">
                    <button
                        className={subTab === 'fees' ? 'active' : ''}
                        onClick={() => setSubTab('fees')}
                    >
                        {getIcon("scale-balanced")} الرسوم والالتزامات
                    </button>
                    <button
                        className={subTab === 'zatca' ? 'active' : ''}
                        onClick={() => setSubTab('zatca')}
                    >
                        {getIcon("shield-check")} إعدادات زاتكا (ZATCA)
                    </button>
                </div>
            </div>

            {subTab === 'zatca' ? (
                <ZatcaSettingsTab />
            ) : (
                <>
                    <PageSubHeader
                        title="الالتزامات الحكومية (الخراج)"
                        titleIcon="money-bill-wave"
                        actions={
                            <Button
                                onClick={() => handleOpenDialog()}
                                variant="primary"
                                icon="plus"
                            >
                                إضافة التزام جديد
                            </Button>
                        }
                    />
                    <Table
                        columns={feesColumns}
                        data={fees}
                        keyExtractor={(fee) => fee.id}
                        isLoading={isLoading}
                        emptyMessage="لا توجد التزامات مسجلة"
                    />
                </>
            )}

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={editingFee ? "تعديل التزام" : "إضافة التزام جديد"}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
                    </>
                }
            >
                <div className="form-group">
                    <TextInput
                        label="الاسم *"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسم الالتزام"
                    />
                </div>

                <div className="row">
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="النسبة المئوية (%)"
                            type="number"
                            step="0.01"
                            value={formData.percentage}
                            onChange={e => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                        />
                        <small className="text-muted">نسبة من السعر الخاضع للرسوم (السعر الأساسي)</small>
                    </div>
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="مبلغ ثابت (إضافي)"
                            type="number"
                            step="0.01"
                            value={formData.fixed_amount}
                            onChange={e => setFormData({ ...formData, fixed_amount: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <Select
                        label="ربط بحساب محاسبي (GL) *"
                        value={formData.account_id || ""}
                        onChange={e => setFormData({ ...formData, account_id: Number(e.target.value) })}
                    >
                        <option value="">اختر الحساب...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.account_code} - {acc.account_name}
                            </option>
                        ))}
                    </Select>
                    <small className="text-muted">سيتم تسجيل الالتزام في هذا الحساب عند البيع</small>
                </div>

                <div className="form-group checkbox-group">
                    <Checkbox
                        label="تفعيل هذا الرسوم"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                </div>

                <div className="alert alert-info mt-3">
                    <strong>مثال:</strong> عند بيع منتج بقيمة 1000 ريال:
                    <br />
                    قيمة الخراج = {calculateSample().toFixed(2)} ريال
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا السجل؟ لن يؤثر الحذف على الفواتير القديمة المحفوظة."
                confirmText="حذف"
                confirmVariant="danger"
            />
        </div>
    );
}
