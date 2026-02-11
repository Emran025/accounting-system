"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, SearchableSelect, showToast, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { EmployeeAsset } from "@/app/hr/types";
import { PageSubHeader } from "@/components/layout";

interface AssetFormProps {
    asset?: EmployeeAsset;
}

export function AssetForm({ asset }: AssetFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    const [form, setForm] = useState({
        employee_id: "",
        asset_code: "",
        asset_name: "",
        asset_type: "laptop",
        serial_number: "",
        qr_code: "",
        allocation_date: new Date().toISOString().split('T')[0],
        return_date: "",
        status: "allocated",
        next_maintenance_date: "",
        notes: ""
    });

    useEffect(() => {
        loadEmployees();
        if (asset) {
            setForm({
                employee_id: asset.employee_id.toString(),
                asset_code: asset.asset_code,
                asset_name: asset.asset_name,
                asset_type: asset.asset_type,
                serial_number: asset.serial_number || "",
                qr_code: asset.qr_code || "",
                allocation_date: asset.allocation_date,
                return_date: asset.return_date || "",
                status: asset.status,
                next_maintenance_date: asset.next_maintenance_date || "",
                notes: asset.notes || ""
            });
        } else {
            // Generate a default asset code
            setForm(prev => ({
                ...prev,
                asset_code: `AST-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
            }));
        }
    }, [asset]);

    const loadEmployees = async () => {
        try {
            const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
            setEmployees(res.data || res || []);
        } catch (error) {
            console.error("Failed to load employees", error);
        }
    };

    const handleSubmit = async () => {
        if (!form.employee_id || !form.asset_code || !form.asset_name || !form.allocation_date) {
            showToast("يرجى تعبئة الحقول المطلوبة", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                employee_id: Number(form.employee_id),
                serial_number: form.serial_number || null,
                qr_code: form.qr_code || null,
                return_date: form.return_date || null,
                next_maintenance_date: form.next_maintenance_date || null,
            };

            if (asset) {
                await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_ASSETS.BASE}/${asset.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showToast("تم تحديث الفقد بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_ASSETS.BASE, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast("تم إنشاء الأصل بنجاح", "success");
            }
            router.push('/hr/employee-assets');
        } catch (error: any) {
            showToast(error.message || "فشل حفظ الأصل", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={asset ? "تعديل أصل" : "إضافة أصل جديد"}
                titleIcon="laptop"
                actions={
                    <Button variant="secondary" onClick={() => router.back()}>
                        عودة
                    </Button>
                }
            />
            <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <Label className="text-secondary mb-1">الموظف *</Label>
                        <SearchableSelect
                            options={employees.map(e => ({ value: e.id.toString(), label: e.full_name }))}
                            value={form.employee_id}
                            onChange={(val) => setForm({ ...form, employee_id: val?.toString() || "" })}
                            placeholder="اختر الموظف"
                        />
                    </div>
                    <TextInput
                        label="رمز الأصل *"
                        value={form.asset_code}
                        onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="اسم الأصل *"
                        value={form.asset_name}
                        onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                    />
                    <Select
                        label="نوع الأصل *"
                        value={form.asset_type}
                        onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
                        options={[
                            { value: 'laptop', label: 'لابتوب' },
                            { value: 'phone', label: 'هاتف' },
                            { value: 'vehicle', label: 'مركبة' },
                            { value: 'key', label: 'مفتاح' },
                            { value: 'equipment', label: 'معدات' },
                            { value: 'other', label: 'أخرى' }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="الرقم التسلسلي"
                        value={form.serial_number}
                        onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                    />
                    <TextInput
                        label="رمز QR"
                        value={form.qr_code}
                        onChange={(e) => setForm({ ...form, qr_code: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="تاريخ التخصيص *"
                        type="date"
                        value={form.allocation_date}
                        onChange={(e) => setForm({ ...form, allocation_date: e.target.value })}
                    />
                    <TextInput
                        label="تاريخ الاسترداد"
                        type="date"
                        value={form.return_date}
                        onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="الحالة *"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        options={[
                            { value: 'allocated', label: 'مخصص' },
                            { value: 'returned', label: 'مسترد' },
                            { value: 'maintenance', label: 'صيانة' },
                            { value: 'lost', label: 'مفقود' },
                            { value: 'damaged', label: 'تالف' }
                        ]}
                    />
                    <TextInput
                        label="تاريخ الصيانة القادمة"
                        type="date"
                        value={form.next_maintenance_date}
                        onChange={(e) => setForm({ ...form, next_maintenance_date: e.target.value })}
                    />
                </div>

                <Textarea
                    label="ملاحظات"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                />

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={() => router.back()}>إلغاء</Button>
                    <Button variant="primary" onClick={handleSubmit} icon="save" disabled={isSubmitting}>
                        {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
