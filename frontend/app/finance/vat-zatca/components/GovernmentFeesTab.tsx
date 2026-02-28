"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Dialog, ConfirmDialog, Table, Column, ActionButtons, Button } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/useAuthStore";
import { PageSubHeader } from "@/components/layout";
import { TaxType, TaxAuthority, Account } from "../types";

export function GovernmentFeesTab() {
    const { canAccess } = useAuthStore();
    const [authorities, setAuthorities] = useState<TaxAuthority[]>([]);
    const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Provide default form values corresponding to the API validation
    const [formData, setFormData] = useState<any>({
        tax_authority_id: "",
        name: "",
        code: "",
        calculation_type: "percentage",
        rate: 0,
        fixed_amount: 0,
        gl_account_code: "",
        applicable_areas: ["sales"],
        is_active: true
    });

    const loadSetup = useCallback(async () => {
        try {
            const response: any = await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.SETUP);
            if (response.data && response.data.authorities) {
                const loadedAuthorities = response.data.authorities;
                setAuthorities(loadedAuthorities);

                // Flatten tax types from all authorities into a single array for the table
                const allTypes: TaxType[] = [];
                loadedAuthorities.forEach((auth: TaxAuthority) => {
                    if (auth.tax_types) {
                        auth.tax_types.forEach((tt) => {
                            allTypes.push({
                                ...tt,
                                tax_authority_name: auth.name
                            } as any);
                        });
                    }
                });
                setTaxTypes(allTypes);
            }
        } catch (e) {
            console.error(e);
            showToast("خطأ في تحميل إعدادات محرك الضرائب", "error");
        }
    }, []);

    const loadAccounts = useCallback(async () => {
        try {
            const response: any = await fetchAPI(API_ENDPOINTS.FINANCE.ACCOUNTS.BASE);
            if (response.data) {
                const list = Array.isArray(response.data) ? response.data : (response.data.accounts || []);
                if (Array.isArray(list)) {
                    // Filter down to liability accounts. Ideally we'd pull standard ones.
                    setAccounts(list.filter((a: any) => a.account_type === 'Liability' || a.account_type === 'Expense'));
                }
            }
        } catch (e) {
            console.error("Error loading accounts", e);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([loadSetup(), loadAccounts()]);
            setIsLoading(false);
        };
        init();
    }, [loadSetup, loadAccounts]);

    const handleOpenDialog = (taxType?: TaxType) => {
        if (taxType) {
            setEditingFeeId(taxType.id);

            // Extract the default rate logic
            let defaultRateObj = taxType.tax_rates?.find(r => r.is_default) || taxType.tax_rates?.[0] || { rate: 0, fixed_amount: 0 };

            // Parse applicable areas correctly
            let areas = ["sales"];
            if (typeof taxType.applicable_areas === 'string') {
                try { areas = JSON.parse(taxType.applicable_areas); } catch { }
            } else if (Array.isArray(taxType.applicable_areas)) {
                areas = taxType.applicable_areas;
            }

            setFormData({
                tax_authority_id: taxType.tax_authority_id,
                name: taxType.name,
                code: taxType.code,
                calculation_type: taxType.calculation_type,
                rate: defaultRateObj.rate * 100, // Show as percentage UI
                fixed_amount: defaultRateObj.fixed_amount,
                gl_account_code: taxType.gl_account_code || "",
                applicable_areas: areas,
                is_active: taxType.is_active
            });
        } else {
            setEditingFeeId(null);
            setFormData({
                tax_authority_id: authorities.length > 0 ? authorities[0].id : "",
                name: "",
                code: `FEE_${Date.now().toString().slice(-4)}`,
                calculation_type: "percentage",
                rate: 0,
                fixed_amount: 0,
                gl_account_code: "",
                applicable_areas: ["sales"],
                is_active: true
            });
        }
        setDialogOpen(true);
    };

    const toggleArea = (area: string) => {
        const current = formData.applicable_areas as string[];
        if (current.includes(area)) {
            setFormData({ ...formData, applicable_areas: current.filter(a => a !== area) });
        } else {
            setFormData({ ...formData, applicable_areas: [...current, area] });
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.code || !formData.tax_authority_id) {
            showToast("يرجى إدخال الحقول الأساسية (الاسم، الرمز، الجهة)", "error");
            return;
        }

        try {
            const payload = {
                ...formData,
                rate: formData.calculation_type === 'percentage' ? (Number(formData.rate) / 100) : 0,
                fixed_amount: formData.calculation_type === 'fixed_amount' ? Number(formData.fixed_amount) : 0,
            };

            if (editingFeeId) {
                await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.TYPES.withId(editingFeeId), {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                showToast("تم تحديث الفئة الضريبية/الالتزام بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.TYPES.BASE, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                showToast("تم إضافة الفئة الضريبية/الالتزام بنجاح", "success");
            }
            setDialogOpen(false);
            loadSetup();
        } catch (e) {
            console.error(e);
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
            await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.TYPES.withId(deleteId), { method: "DELETE" });
            showToast("تم الحذف بنجاح", "success");
            loadSetup();
        } catch (e) {
            showToast("حدث خطأ أثناء الحذف أو الالتزام مستخدم في عمليات", "error");
        } finally {
            setConfirmDialogOpen(false);
        }
    };

    const getAccountName = (code: string) => {
        const acc = accounts.find(a => a.account_code === code);
        return acc ? `${acc.account_code} - ${acc.account_name}` : code;
    };

    const columns: Column<TaxType>[] = [
        {
            key: "code",
            header: "الرمز",
            render: (fee) => <span className="text-muted">{fee.code}</span>
        },
        {
            key: "name",
            header: "الاسم",
        },
        {
            key: "calculation_type",
            header: "النوع",
            render: (fee) => fee.calculation_type === 'percentage' ? 'نسبة' : 'مبلغ ثابت',
        },
        {
            key: "gl_account_code",
            header: "الجهة (الهيئة)",
            render: (fee: any) => <span className="badge badge-info">{fee.tax_authority_name || 'جهة غير محددة'}</span>
        },
        {
            key: "gl_account_code", // Just to render something different
            header: "القيمة",
            render: (fee) => {
                const defRate = fee.tax_rates?.find(r => r.is_default) || fee.tax_rates?.[0];
                if (!defRate) return '-';
                return fee.calculation_type === 'percentage'
                    ? `${Number(defRate.rate * 100).toFixed(2)}%`
                    : `${defRate.fixed_amount} ريال`;
            },
        },
        {
            key: "tax_authority_id",
            header: "نطاق التطبيق",
            render: (fee) => {
                let areas = [];
                try { areas = typeof fee.applicable_areas === 'string' ? JSON.parse(fee.applicable_areas) : fee.applicable_areas; } catch { }
                return areas.map((a: string) => (
                    <span key={a} className="badge badge-secondary me-1 ms-1">
                        {a === 'sales' ? 'المبيعات' : a === 'purchases' ? 'المشتريات' : a === 'payroll' ? 'الرواتب' : a}
                    </span>
                ));
            }
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
            <PageSubHeader
                title="الضرائب والالتزامات الحكومية الموحدة"
                titleIcon="box"
                actions={
                    <Button
                        onClick={() => handleOpenDialog()}
                        variant="primary"
                        icon="plus"
                    >
                        إضافة شرط ضريبي / رسم جديد
                    </Button>
                }
            />
            {authorities.length === 0 && !isLoading && (
                <div className="alert alert-warning">
                    الرجاء أولاً التأكد من تفعيل وتكوين السلطة الضريبية (Tax Authority) في الخادم!
                </div>
            )}

            <Table
                columns={columns}
                data={taxTypes}
                keyExtractor={(fee) => fee.id}
                isLoading={isLoading}
                emptyMessage="لا توجد استقطاعات أو التزامات مسجلة"
            />

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={editingFeeId ? "تعديل الشرط/الالتزام" : "إضافة شرط ضريبي/التزام جديد"}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSave}>حفظ وإرسال لمحرك الضرائب (Tax Engine)</button>
                    </>
                }
            >
                <div className="alert alert-info py-2">
                    <i className="fa-solid fa-server me-2 ms-2 text-primary"></i>
                    هذه اللوحة مرتبطة بشكل مباشر مع "محرك الضرائب". جميع القواعد تحدد مكانياً وسوف تطبق بناء على النطاق تلقائياً أثناء المبيعات والمشتريات.
                </div>

                <div className="row">
                    <div className="col-md-6 form-group">
                        <Select
                            label="الجهة (السلطة الضريبية) *"
                            value={formData.tax_authority_id}
                            onChange={(e) => setFormData({ ...formData, tax_authority_id: e.target.value })}
                            disabled={!!editingFeeId}
                        >
                            <option value="">-- اختر --</option>
                            {authorities.map(auth => (
                                <option key={auth.id} value={auth.id}>{auth.name} ({auth.code})</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-md-6 form-group">
                        <TextInput
                            label="رمز النظام (Code) *"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g. VAT_SA, MUNICIPAL_FEE"
                            disabled={!!editingFeeId}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <TextInput
                        label="الاسم التعريفي *"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسم الرسوم أو الضريبة (مثل: ضريبة القيمة المضافة / خراج)"
                    />
                </div>

                <div className="row mt-3">
                    <div className="col-12 form-group">
                        <label className="form-label fw-bold"><i className="fa-solid fa-calculator me-2 ms-2"></i>معادلات الحساب:</label>
                        <div className="d-flex gap-4">
                            <div className="form-check">
                                <input className="form-check-input" type="radio" name="calc_type"
                                    checked={formData.calculation_type === 'percentage'}
                                    onChange={() => setFormData({ ...formData, calculation_type: 'percentage' })}
                                />
                                <label className="form-check-label">نسبة مئوية (%) من المجموع الخاضع</label>
                            </div>
                            <div className="form-check">
                                <input className="form-check-input" type="radio" name="calc_type"
                                    checked={formData.calculation_type === 'fixed_amount'}
                                    onChange={() => setFormData({ ...formData, calculation_type: 'fixed_amount' })}
                                />
                                <label className="form-check-label">مبلغ ثابت مقطوع (لكل عملية)</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {formData.calculation_type === 'percentage' ? (
                        <div className="col-md-12 form-group">
                            <TextInput
                                label="القيمة الافتراضية للنسبة المئوية (%) *"
                                type="number"
                                step="0.01"
                                value={formData.rate}
                                onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                            />
                            <small className="text-muted">أدخل النسبة مثل (15) لتطبيق 15%</small>
                        </div>
                    ) : (
                        <div className="col-md-12 form-group">
                            <TextInput
                                label="المبلغ الثابت الافتراضي *"
                                type="number"
                                step="0.01"
                                value={formData.fixed_amount}
                                onChange={e => setFormData({ ...formData, fixed_amount: parseFloat(e.target.value) })}
                            />
                            <small className="text-muted">مبلغ إضافي يُضاف بشكل مطلق (e.g. رسوم بلديات ثابته 50 ريال)</small>
                        </div>
                    )}
                </div>

                <div className="form-group mt-3">
                    <Select
                        label="ربط بحساب دليل الحسابات (GL Mapping Account)"
                        value={formData.gl_account_code || ""}
                        onChange={e => setFormData({ ...formData, gl_account_code: e.target.value })}
                    >
                        <option value="">بدون ربط تلقائي (أو افتراضي للنظام)</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.account_code}>
                                {acc.account_code} - {acc.account_name}
                            </option>
                        ))}
                    </Select>
                    <small className="text-muted">إجبارياً، النظام سيُصدّر القيم لهذا الحساب عند صدور الفواتير أو المشتريات.</small>
                </div>

                <div className="form-group mt-3">
                    <label className="form-label fw-bold">تطبيق الاستقطاع/الالتزام على الوحدات (Applicable Areas):</label>
                    <div className="d-flex gap-3 flex-wrap mt-2">
                        <Checkbox label="المبيعات والفواتير (Sales)" checked={formData.applicable_areas.includes("sales")} onChange={() => toggleArea("sales")} />
                        <Checkbox label="المشتريات والموردين (Purchases)" checked={formData.applicable_areas.includes("purchases")} onChange={() => toggleArea("purchases")} />
                        <Checkbox label="الرواتب ونظام شؤون الموظفين (Payroll)" checked={formData.applicable_areas.includes("payroll")} onChange={() => toggleArea("payroll")} />
                    </div>
                </div>

                <div className="form-group checkbox-group mt-4">
                    <Checkbox
                        label="تفعيل هذه السلطة محلياً والمطالبة بالامتثال"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                </div>

            </Dialog>

            <ConfirmDialog
                isOpen={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد الحذف من سجل الضرائب"
                message="هل أنت متأكد من حذف هذه الفئة الضريبية/الرسم الحكومي؟ لن يحطم هذا الفواتير القديمة لكن سيتم إيقاف حسابه مستقبلاً."
                confirmText="حذف نهائي"
                confirmVariant="danger"
            />
        </div>
    );
}
