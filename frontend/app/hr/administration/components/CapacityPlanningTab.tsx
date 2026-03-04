"use client";

import { useState, useEffect } from "react";
import { Button, Table, Column, Dialog, showToast, Select, ActionButtons } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { JobTitle } from "@/app/hr/types";
import { PageSubHeader } from "@/components/layout";

interface JobTitleForm {
    title_ar: string;
    title_en: string;
    department_id: string;
    description: string;
}

const emptyForm: JobTitleForm = {
    title_ar: "",
    title_en: "",
    department_id: "",
    description: "",
};

export function JobTitlesTab() {
    const { canAccess } = useAuthStore();
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editItem, setEditItem] = useState<JobTitle | null>(null);
    const [departments, setDepartments] = useState<Array<{ id: number; name_ar: string }>>([]);
    const [form, setForm] = useState<JobTitleForm>(emptyForm);

    useEffect(() => {
        loadJobTitles();
        loadDepartments();
    }, []);

    const loadJobTitles = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.BASE);
            setJobTitles((res as any).data || []);
        } catch {
            console.error("Failed to load job titles");
        } finally {
            setIsLoading(false);
        }
    };

    const loadDepartments = async () => {
        try {
            const res = await fetchAPI("/departments");
            setDepartments((res as any).data || (res as any) || []);
        } catch {
            console.error("Failed to load departments");
        }
    };

    const handleSave = async () => {
        if (!form.title_ar) {
            showToast("يرجى إدخال اسم المسمى الوظيفي", "error");
            return;
        }
        try {
            const payload = {
                title_ar: form.title_ar,
                title_en: form.title_en || null,
                department_id: form.department_id ? Number(form.department_id) : null,
                description: form.description || null,
            };

            if (editItem) {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.withId(editItem.id), {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                showToast("تم تحديث المسمى الوظيفي", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.BASE, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                showToast("تم إنشاء المسمى الوظيفي", "success");
            }

            setShowDialog(false);
            setEditItem(null);
            setForm(emptyForm);
            loadJobTitles();
        } catch {
            showToast("فشل حفظ المسمى الوظيفي", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المسمى؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.withId(id), { method: "DELETE" });
            showToast("تم حذف المسمى الوظيفي", "success");
            loadJobTitles();
        } catch (e: any) {
            showToast(e?.message || "فشل حذف المسمى", "error");
        }
    };

    const openEdit = (item: JobTitle) => {
        setForm({
            title_ar: item.title_ar,
            title_en: item.title_en || "",
            department_id: item.department_id?.toString() || "",
            description: item.description || "",
        });
        setEditItem(item);
        setShowDialog(true);
    };

    const columns: Column<JobTitle>[] = [
        { key: "title_ar", header: "المسمى الوظيفي (عربي)", dataLabel: "المسمى" },
        {
            key: "title_en",
            header: "المسمى الوظيفي (إنجليزي)",
            dataLabel: "English",
            render: (item) => <span>{item.title_en || "—"}</span>,
        },
        {
            key: "department",
            header: "القسم",
            dataLabel: "القسم",
            render: (item) => <span>{item.department?.name_ar || "غير محدد"}</span>,
        },
        {
            key: "description",
            header: "الوصف",
            dataLabel: "الوصف",
            render: (item) => (
                <span style={{ maxWidth: "200px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.description || "—"}
                </span>
            ),
        },
        {
            key: "is_active",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${item.is_active ? "badge-success" : "badge-danger"}`}>
                    {item.is_active ? "نشط" : "معطل"}
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
                            onClick: () => openEdit(item),
                        },
                        ...(canAccess("employees", "delete")
                            ? [
                                {
                                    icon: "trash" as const,
                                    title: "حذف",
                                    variant: "delete" as const,
                                    onClick: () => handleDelete(item.id),
                                },
                            ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    return (
        <>
            <PageSubHeader
                title="المسميات الوظيفية"
                titleIcon="file-signature"
                actions={
                    <>
                        {canAccess("employees", "create") && (
                            <Button
                                variant="primary"
                                icon="plus"
                                onClick={() => {
                                    setEditItem(null);
                                    setForm(emptyForm);
                                    setShowDialog(true);
                                }}
                            >
                                مسمى وظيفي جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table
                columns={columns}
                data={jobTitles}
                keyExtractor={(i) => i.id.toString()}
                emptyMessage="لا توجد مسميات وظيفية"
                isLoading={isLoading}
            />

            <Dialog
                isOpen={showDialog}
                onClose={() => setShowDialog(false)}
                title={editItem ? "تعديل المسمى الوظيفي" : "مسمى وظيفي جديد"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowDialog(false)}>
                            إلغاء
                        </Button>
                        <Button variant="primary" onClick={handleSave}>
                            {editItem ? "تحديث" : "إنشاء"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <TextInput
                        label="المسمى الوظيفي (عربي) *"
                        value={form.title_ar}
                        onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                    />
                    <TextInput
                        label="المسمى الوظيفي (إنجليزي)"
                        value={form.title_en}
                        onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                    />
                    <Select
                        label="القسم"
                        value={form.department_id}
                        onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                        options={[
                            { value: "", label: "-- اختر القسم --" },
                            ...departments.map((d) => ({ value: d.id.toString(), label: d.name_ar })),
                        ]}
                    />
                    <Textarea
                        label="الوصف"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                    />
                </div>
            </Dialog>
        </>
    );
}
