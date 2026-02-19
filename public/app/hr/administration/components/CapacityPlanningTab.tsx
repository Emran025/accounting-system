"use client";

import { useState, useEffect } from "react";
import { Button, Table, Column, Dialog, showToast, Select, SearchableSelect, ActionButtons } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { JobTitle } from "@/app/hr/types";
import { PageSubHeader } from "@/components/layout";
import { StatsCard } from "@/components/ui/StatsCard";
import { getIcon } from "@/lib/icons";

export function CapacityPlanningTab() {
    const { canAccess } = useAuthStore();
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState<JobTitle | null>(null);
    const [departments, setDepartments] = useState<Array<{ id: number; name_ar: string }>>([]);
    const [capacityData, setCapacityData] = useState<{
        total_positions: number;
        total_filled: number;
        total_vacancies: number;
    }>({ total_positions: 0, total_filled: 0, total_vacancies: 0 });

    const [form, setForm] = useState({
        title_ar: "", title_en: "", department_id: "", max_headcount: "1", description: "",
    });

    useEffect(() => {
        loadJobTitles();
        loadDepartments();
    }, []);

    const loadJobTitles = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.BASE);
            setJobTitles((res as any).data || []);

            const capRes = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.CAPACITY_OVERVIEW);
            const capData = (capRes as any).data;
            if (capData) {
                setCapacityData({
                    total_positions: capData.total_positions || 0,
                    total_filled: capData.total_filled || 0,
                    total_vacancies: capData.total_vacancies || 0,
                });
            }
        } catch { console.error("Failed to load job titles"); }
        finally { setIsLoading(false); }
    };

    const loadDepartments = async () => {
        try {
            const res = await fetchAPI("/departments");
            setDepartments((res as any).data || (res as any) || []);
        } catch { console.error("Failed to load departments"); }
    };

    const handleSave = async () => {
        if (!form.title_ar) { showToast("يرجى إدخال اسم المسمى الوظيفي", "error"); return; }
        try {
            const payload = {
                ...form,
                department_id: form.department_id ? Number(form.department_id) : null,
                max_headcount: Number(form.max_headcount),
            };
            if (editItem) {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.withId(editItem.id), { method: "PUT", body: JSON.stringify(payload) });
                showToast("تم تحديث المسمى الوظيفي", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.BASE, { method: "POST", body: JSON.stringify(payload) });
                showToast("تم إنشاء المسمى الوظيفي", "success");
            }
            setShowAdd(false);
            setEditItem(null);
            setForm({ title_ar: "", title_en: "", department_id: "", max_headcount: "1", description: "" });
            loadJobTitles();
        } catch { showToast("فشل حفظ المسمى الوظيفي", "error"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المسمى؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.withId(id), { method: "DELETE" });
            showToast("تم حذف المسمى الوظيفي", "success");
            loadJobTitles();
        } catch (e: any) { showToast(e?.message || "فشل حذف المسمى", "error"); }
    };

    const openEdit = (item: JobTitle) => {
        setForm({
            title_ar: item.title_ar,
            title_en: item.title_en || "",
            department_id: item.department_id?.toString() || "",
            max_headcount: item.max_headcount.toString(),
            description: item.description || "",
        });
        setEditItem(item);
        setShowAdd(true);
    };

    const utilizationPct = capacityData.total_positions > 0
        ? Math.round((capacityData.total_filled / capacityData.total_positions) * 100)
        : 0;

    const columns: Column<JobTitle>[] = [
        { key: "title_ar", header: "المسمى الوظيفي", dataLabel: "المسمى" },
        { key: "department", header: "القسم", dataLabel: "القسم", render: (item) => <span>{item.department?.name_ar || "غير محدد"}</span> },
        { key: "max_headcount", header: "السعة القصوى", dataLabel: "السعة" },
        { key: "current_headcount", header: "الشاغلين", dataLabel: "الشاغلين" },
        {
            key: "vacancy_count", header: "الشواغر", dataLabel: "شواغر",
            render: (item) => {
                const vacancy = item.vacancy_count ?? (item.max_headcount - item.current_headcount);
                return (
                    <span className={`badge ${vacancy > 0 ? "badge-success" : "badge-danger"}`}>
                        {vacancy > 0 ? `${vacancy} شاغر` : "مكتمل"}
                    </span>
                );
            },
        },

        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "عرض التفاصيل",
                            variant: "view",
                            onClick: () => openEdit(item)
                        },
                        ...(canAccess("employees", "delete") ? [{
                            icon: "trash" as const,
                            title: "حذف",
                            variant: "delete" as const,
                            onClick: () => handleDelete(item.id)
                        }] : [])
                    ]}
                />
            ),
        },
    ];

    return (
        <>
            {/* Capacity Overview Cards */}
            <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <StatsCard
                    title="إجمالي المناصب"
                    value={capacityData.total_positions}
                    icon={getIcon("briefcase")}
                    colorClass="default"
                />
                <StatsCard
                    title="مناصب مشغولة"
                    value={capacityData.total_filled}
                    icon={getIcon("check-circle")}
                    colorClass="products"
                />
                <StatsCard
                    title="شواغر متاحة"
                    value={capacityData.total_vacancies}
                    icon={getIcon("user-plus")}
                    colorClass="total"
                />
                <StatsCard
                    title="نسبة الاستخدام"
                    value={`${utilizationPct}%`}
                    icon={getIcon("chart-pie")}
                    colorClass={utilizationPct > 90 ? "alert" : "sales"}
                />
                <StatsCard
                    title="معدل الاستيعاب الكلي"
                    value={`${utilizationPct}%`}
                    icon={getIcon("chart-pie")}
                    colorClass={utilizationPct > 90 ? "alert" : "sales"}
                />
            </div>

            {/* Utilization Progress Bar
            <div className="sales-card" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span className="stat-label">معدل الاستيعاب الكلي</span>
                    <span className={`badge ${utilizationPct > 90 ? "badge-danger" : utilizationPct > 70 ? "badge-warning" : "badge-success"}`}>
                        {utilizationPct}%
                    </span>
                </div>
                <div className="progress-bar-track">
                    <div
                        className={`progress-bar-fill ${utilizationPct > 90 ? "danger" : utilizationPct > 70 ? "warning" : "success"}`}
                        style={{ width: `${utilizationPct}%` }}
                    />
                </div>
            </div> */}

            <PageSubHeader
                title="المسميات الوظيفية"
                titleIcon="file-signature"
                actions={
                    <>
                        {canAccess("employees", "create") && (
                            <Button variant="primary" icon="plus" onClick={() => { setEditItem(null); setForm({ title_ar: "", title_en: "", department_id: "", max_headcount: "1", description: "" }); setShowAdd(true); }}>
                                مسمى وظيفي جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table columns={columns} data={jobTitles} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد مسميات وظيفية" isLoading={isLoading} />

            <Dialog isOpen={showAdd} onClose={() => setShowAdd(false)} title={editItem ? "تعديل المسمى الوظيفي" : "مسمى وظيفي جديد"} footer={
                <>
                    <Button variant="secondary" onClick={() => setShowAdd(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleSave}>{editItem ? "تحديث" : "إنشاء"}</Button>
                </>
            }>
                <div className="space-y-4">
                    <TextInput label="المسمى الوظيفي (عربي) *" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                    <TextInput label="المسمى الوظيفي (إنجليزي)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
                    <Select label="القسم" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                        options={[{ value: "", label: "-- اختر القسم --" }, ...departments.map((d) => ({ value: d.id.toString(), label: d.name_ar }))]}
                    />
                    <TextInput label="السعة القصوى *" type="number" value={form.max_headcount} onChange={(e) => setForm({ ...form, max_headcount: e.target.value })} />
                    <Textarea label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
            </Dialog>
        </>
    );
}
