"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, SearchableSelect, showToast, Label } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { EmployeeContract, Employee } from "@/app/hr/types";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { PageSubHeader } from "@/components/layout";

interface ContractFormProps {
    contract?: EmployeeContract;
}

export function ContractForm({ contract }: ContractFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();

    const [form, setForm] = useState({
        employee_id: "",
        contract_number: "",
        contract_start_date: new Date().toISOString().split('T')[0],
        contract_end_date: "",
        probation_end_date: "",
        base_salary: "",
        contract_type: "full_time",
        is_current: true,
        notes: ""
    });

    useEffect(() => {
        loadAllEmployees();
        if (contract) {
            setForm({
                employee_id: contract.employee_id.toString(),
                contract_number: contract.contract_number,
                contract_start_date: contract.contract_start_date,
                contract_end_date: contract.contract_end_date || "",
                probation_end_date: contract.probation_end_date || "",
                base_salary: contract.base_salary.toString(),
                contract_type: contract.contract_type,
                is_current: contract.is_current,
                notes: contract.notes || ""
            });
        } else {
            // Generate a default contract number
            setForm(prev => ({
                ...prev,
                contract_number: `CNT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
            }));
        }
    }, [contract, loadAllEmployees]);

    const handleSubmit = async () => {
        if (!form.employee_id || !form.contract_number || !form.contract_start_date || !form.base_salary) {
            showToast("يرجى تعبئة الحقول المطلوبة", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                employee_id: Number(form.employee_id),
                base_salary: Number(form.base_salary),
                contract_end_date: form.contract_end_date || null,
                probation_end_date: form.probation_end_date || null,
            };

            if (contract) {
                await fetchAPI(`${API_ENDPOINTS.HR.CONTRACTS.BASE}/${contract.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showToast("تم تحديث العقد بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.HR.CONTRACTS.BASE, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast("تم إنشاء العقد بنجاح", "success");
            }
            router.push('/hr/contracts');
        } catch (error: any) {
            showToast(error.message || "فشل حفظ العقد", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={contract ? "تعديل عقد" : "إضافة عقد جديد"}
                titleIcon="file-contract"
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
                            options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))}
                            value={form.employee_id}
                            onChange={(val) => setForm({ ...form, employee_id: val?.toString() || "" })}
                            placeholder="اختر الموظف"
                            disabled={!!contract} // Disable changing employee on edit if desired, usually okay to allow though
                        />
                    </div>
                    <TextInput
                        label="رقم العقد *"
                        value={form.contract_number}
                        onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="تاريخ البدء *"
                        type="date"
                        value={form.contract_start_date}
                        onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })}
                    />
                    <TextInput
                        label="تاريخ الانتهاء"
                        type="date"
                        value={form.contract_end_date}
                        onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="الراتب الأساسي *"
                        type="number"
                        value={form.base_salary}
                        onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                    />
                    <Select
                        label="نوع العقد *"
                        value={form.contract_type}
                        onChange={(e) => setForm({ ...form, contract_type: e.target.value as any })}
                        options={[
                            { value: 'full_time', label: 'دوام كامل' },
                            { value: 'part_time', label: 'دوام جزئي' },
                            { value: 'contract', label: 'عقد محدد المدة' },
                            { value: 'freelance', label: 'عمل حر' }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        label="تاريخ انتهاء التجربة"
                        type="date"
                        value={form.probation_end_date}
                        onChange={(e) => setForm({ ...form, probation_end_date: e.target.value })}
                    />

                    <div className="mt-8">
                        <Checkbox
                            id="is_current"
                            checked={form.is_current}
                            onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
                            label="عقد ساري حالياً (نشط)"
                        />
                    </div>
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
