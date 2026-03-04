"use client";

import { useState, useEffect } from "react";
import { Button, Table, Column, Dialog, showToast, Select, SearchableSelect, ActionButtons, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Position, JobTitle } from "@/app/hr/types";
import { PageSubHeader } from "@/components/layout";
import { StatsCard } from "@/components/ui/StatsCard";
import { getIcon } from "@/lib/icons";

interface PositionForm {
    position_name_ar: string;
    position_name_en: string;
    job_title_id: string;
    role_id: string;
    department_id: string;
    grade_level: string;
    min_salary: string;
    max_salary: string;
    description: string;
}

const emptyForm: PositionForm = {
    position_name_ar: "",
    position_name_en: "",
    job_title_id: "",
    role_id: "",
    department_id: "",
    grade_level: "",
    min_salary: "",
    max_salary: "",
    description: "",
};

export function PositionsTab() {
    const { canAccess } = useAuthStore();
    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editItem, setEditItem] = useState<Position | null>(null);
    const [detailItem, setDetailItem] = useState<Position | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [form, setForm] = useState<PositionForm>(emptyForm);

    // Lookups
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [roles, setRoles] = useState<Array<{ id: number; role_name_ar: string; role_key: string }>>([]);
    const [departments, setDepartments] = useState<Array<{ id: number; name_ar: string }>>([]);

    useEffect(() => {
        loadPositions();
        loadLookups();
    }, []);

    const loadPositions = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.BASE);
            setPositions((res as any).data || []);
        } catch {
            console.error("Failed to load positions");
        } finally {
            setIsLoading(false);
        }
    };

    const loadLookups = async () => {
        try {
            const [jtRes, roleRes, deptRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.JOB_TITLES.BASE),
                fetchAPI(`${API_ENDPOINTS.SYSTEM.USERS.ROLES}?action=roles`),
                fetchAPI("/departments"),
            ]);
            setJobTitles((jtRes as any).data || []);
            setRoles((roleRes as any).data || []);
            setDepartments((deptRes as any).data || (deptRes as any) || []);
        } catch {
            console.error("Failed to load lookups");
        }
    };

    const handleSave = async () => {
        if (!form.position_name_ar) {
            showToast("يرجى إدخال اسم المنصب", "error");
            return;
        }
        if (!form.job_title_id) {
            showToast("يرجى اختيار المسمى الوظيفي", "error");
            return;
        }

        try {
            const payload = {
                position_name_ar: form.position_name_ar,
                position_name_en: form.position_name_en || null,
                job_title_id: Number(form.job_title_id),
                role_id: form.role_id ? Number(form.role_id) : null,
                department_id: form.department_id ? Number(form.department_id) : null,
                grade_level: form.grade_level || null,
                min_salary: form.min_salary ? Number(form.min_salary) : null,
                max_salary: form.max_salary ? Number(form.max_salary) : null,
                description: form.description || null,
            };

            if (editItem) {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.withId(editItem.id), {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                showToast("تم تحديث المنصب بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.BASE, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                showToast("تم إنشاء المنصب بنجاح", "success");
            }

            setShowDialog(false);
            setEditItem(null);
            setForm(emptyForm);
            loadPositions();
        } catch {
            showToast("فشل حفظ المنصب", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المنصب؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.withId(id), { method: "DELETE" });
            showToast("تم حذف المنصب بنجاح", "success");
            loadPositions();
        } catch (e: any) {
            showToast(e?.message || "فشل حذف المنصب", "error");
        }
    };

    const openEdit = (item: Position) => {
        setForm({
            position_name_ar: item.position_name_ar,
            position_name_en: item.position_name_en || "",
            job_title_id: item.job_title_id?.toString() || "",
            role_id: item.role_id?.toString() || "",
            department_id: item.department_id?.toString() || "",
            grade_level: item.grade_level || "",
            min_salary: item.min_salary?.toString() || "",
            max_salary: item.max_salary?.toString() || "",
            description: item.description || "",
        });
        setEditItem(item);
        setShowDialog(true);
    };

    const openDetail = async (id: number) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.withId(id));
            setDetailItem((res as any).data || null);
            setShowDetail(true);
        } catch {
            showToast("فشل تحميل تفاصيل المنصب", "error");
        }
    };

    // Stats
    const totalPositions = positions.length;
    const activePositions = positions.filter((p) => p.is_active).length;
    const assignedCount = positions.reduce((sum, p) => sum + (p.active_employee_count || 0), 0);
    const withRole = positions.filter((p) => p.role_id).length;

    const columns: Column<Position>[] = [
        {
            key: "position_code",
            header: "كود المنصب",
            dataLabel: "الكود",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--primary)" }}>
                    {item.position_code}
                </span>
            ),
        },
        { key: "position_name_ar", header: "اسم المنصب", dataLabel: "المنصب" },
        {
            key: "job_title",
            header: "المسمى الوظيفي",
            dataLabel: "المسمى",
            render: (item) => <span>{item.job_title?.title_ar || "—"}</span>,
        },
        {
            key: "role",
            header: "الدور الوظيفي",
            dataLabel: "الدور",
            render: (item) =>
                item.role ? (
                    <span className="badge badge-info">{item.role.role_name_ar || item.role.role_key}</span>
                ) : (
                    <span className="text-muted">غير محدد</span>
                ),
        },
        {
            key: "department",
            header: "القسم",
            dataLabel: "القسم",
            render: (item) => <span>{item.department?.name_ar || "غير محدد"}</span>,
        },
        {
            key: "active_employee_count",
            header: "الموظفون",
            dataLabel: "الموظفون",
            render: (item) => (
                <span className={`badge ${(item.active_employee_count || 0) > 0 ? "badge-success" : "badge-warning"}`}>
                    {item.active_employee_count || 0} موظف
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
                            icon: "eye",
                            title: "عرض التفاصيل",
                            variant: "view",
                            onClick: () => openDetail(item.id),
                        },
                        {
                            icon: "edit" as const,
                            title: "تعديل",
                            variant: "edit" as const,
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
            {/* Stats Cards */}
            <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <StatsCard
                    title="إجمالي المناصب"
                    value={totalPositions}
                    icon={getIcon("briefcase")}
                    colorClass="default"
                />
                <StatsCard
                    title="مناصب نشطة"
                    value={activePositions}
                    icon={getIcon("check-circle")}
                    colorClass="products"
                />
                <StatsCard
                    title="موظفون مُعيَّنون"
                    value={assignedCount}
                    icon={getIcon("users")}
                    colorClass="total"
                />
                <StatsCard
                    title="مناصب بدور وظيفي"
                    value={withRole}
                    icon={getIcon("shield")}
                    colorClass="sales"
                />
            </div>

            {/* Hierarchy Info */}
            <div
                className="alert alert-info"
                style={{ margin: "1rem 0", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
            >
                {getIcon("info")}
                <div>
                    <strong>سلسلة العلاقات الوظيفية</strong>
                    <p style={{ margin: "0.25rem 0 0" }}>
                        الموظف ← المنصب ← الدور الوظيفي ← الصلاحيات | المنصب ← المسمى الوظيفي.
                        عند تعيين موظف لمنصب، يتم توريث الدور والصلاحيات والمسمى الوظيفي تلقائياً.
                    </p>
                </div>
            </div>

            <PageSubHeader
                title="المناصب الوظيفية"
                titleIcon="layers"
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
                                منصب جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table
                columns={columns}
                data={positions}
                keyExtractor={(i) => i.id.toString()}
                emptyMessage="لا توجد مناصب وظيفية - أنشئ منصب جديد لربط المسمى الوظيفي بالدور والصلاحيات"
                isLoading={isLoading}
            />

            {/* Create / Edit Dialog */}
            <Dialog
                isOpen={showDialog}
                onClose={() => setShowDialog(false)}
                title={editItem ? "تعديل المنصب" : "إنشاء منصب جديد"}
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
                        label="اسم المنصب (عربي) *"
                        value={form.position_name_ar}
                        onChange={(e) => setForm({ ...form, position_name_ar: e.target.value })}
                    />
                    <TextInput
                        label="اسم المنصب (إنجليزي)"
                        value={form.position_name_en}
                        onChange={(e) => setForm({ ...form, position_name_en: e.target.value })}
                    />

                    <div className="form-row">
                        <div className="form-group">
                            <Label>المسمى الوظيفي *</Label>
                            <SearchableSelect
                                options={jobTitles.map((jt) => ({
                                    value: jt.id.toString(),
                                    label: jt.title_ar + (jt.title_en ? ` (${jt.title_en})` : ""),
                                }))}
                                value={form.job_title_id}
                                onChange={(val) => setForm({ ...form, job_title_id: val?.toString() || "" })}
                                placeholder="ابحث عن مسمى وظيفي..."
                            />
                        </div>
                        <div className="form-group">
                            <Label>الدور الوظيفي (الصلاحيات)</Label>
                            <SearchableSelect
                                options={roles.map((r) => ({
                                    value: r.id.toString(),
                                    label: r.role_name_ar || r.role_key,
                                }))}
                                value={form.role_id}
                                onChange={(val) => setForm({ ...form, role_id: val?.toString() || "" })}
                                placeholder="ابحث عن دور وظيفي..."
                            />
                        </div>
                    </div>

                    <Select
                        label="القسم"
                        value={form.department_id}
                        onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                        options={[
                            { value: "", label: "-- اختر القسم --" },
                            ...departments.map((d) => ({ value: d.id.toString(), label: d.name_ar })),
                        ]}
                    />

                    <div className="form-row">
                        <TextInput
                            label="المستوى الوظيفي"
                            value={form.grade_level}
                            onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                            placeholder="مثال: G5, Senior, Junior"
                        />
                    </div>

                    <div className="form-row">
                        <TextInput
                            label="الحد الأدنى للراتب"
                            type="number"
                            value={form.min_salary}
                            onChange={(e) => setForm({ ...form, min_salary: e.target.value })}
                        />
                        <TextInput
                            label="الحد الأقصى للراتب"
                            type="number"
                            value={form.max_salary}
                            onChange={(e) => setForm({ ...form, max_salary: e.target.value })}
                        />
                    </div>

                    <Textarea
                        label="الوصف"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                    />
                </div>
            </Dialog>

            {/* Detail View Dialog */}
            <Dialog
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                title={`تفاصيل المنصب: ${detailItem?.position_name_ar || ""}`}
                footer={
                    <Button variant="secondary" onClick={() => setShowDetail(false)}>
                        إغلاق
                    </Button>
                }
            >
                {detailItem && (
                    <div className="space-y-4">
                        {/* Position Info */}
                        <div className="sales-card" style={{ padding: "1rem" }}>
                            <h4 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {getIcon("layers")} معلومات المنصب
                            </h4>
                            <div className="form-row">
                                <div>
                                    <span className="stat-label">الكود</span>
                                    <p style={{ fontFamily: "monospace", fontWeight: 600 }}>{detailItem.position_code}</p>
                                </div>
                                <div>
                                    <span className="stat-label">الحالة</span>
                                    <p>
                                        <span className={`badge ${detailItem.is_active ? "badge-success" : "badge-danger"}`}>
                                            {detailItem.is_active ? "نشط" : "معطل"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            {detailItem.grade_level && (
                                <div>
                                    <span className="stat-label">المستوى</span>
                                    <p>{detailItem.grade_level}</p>
                                </div>
                            )}
                            {(detailItem.min_salary || detailItem.max_salary) && (
                                <div>
                                    <span className="stat-label">نطاق الراتب</span>
                                    <p>
                                        {detailItem.min_salary?.toLocaleString() || "—"} — {detailItem.max_salary?.toLocaleString() || "—"} ر.س
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Hierarchy Chain */}
                        <div className="sales-card" style={{ padding: "1rem" }}>
                            <h4 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {getIcon("git-branch")} سلسلة العلاقات
                            </h4>
                            <div className="form-row">
                                <div>
                                    <span className="stat-label">المسمى الوظيفي</span>
                                    <p className="badge badge-info">{detailItem.job_title?.title_ar || "—"}</p>
                                </div>
                                <div>
                                    <span className="stat-label">الدور الوظيفي</span>
                                    <p className="badge badge-warning">
                                        {detailItem.role?.role_name_ar || detailItem.role?.role_key || "غير محدد"}
                                    </p>
                                </div>
                                <div>
                                    <span className="stat-label">القسم</span>
                                    <p>{detailItem.department?.name_ar || "غير محدد"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Permissions from Role */}
                        {detailItem.role?.permissions && detailItem.role.permissions.length > 0 && (
                            <div className="sales-card" style={{ padding: "1rem" }}>
                                <h4 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {getIcon("shield")} الصلاحيات الموروثة من الدور
                                </h4>
                                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                    <table className="mini-table" style={{ width: "100%", fontSize: "0.85rem" }}>
                                        <thead>
                                            <tr>
                                                <th>الوحدة</th>
                                                <th>عرض</th>
                                                <th>إضافة</th>
                                                <th>تعديل</th>
                                                <th>حذف</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailItem.role.permissions.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td>{p.module?.module_name_ar || p.module?.module_key || "—"}</td>
                                                    <td>{p.can_view ? "✓" : "—"}</td>
                                                    <td>{p.can_create ? "✓" : "—"}</td>
                                                    <td>{p.can_edit ? "✓" : "—"}</td>
                                                    <td>{p.can_delete ? "✓" : "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Assigned Employees */}
                        <div className="sales-card" style={{ padding: "1rem" }}>
                            <h4 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {getIcon("users")} الموظفون المعيّنون ({detailItem.employees?.length || 0})
                            </h4>
                            {detailItem.employees && detailItem.employees.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                    {detailItem.employees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            className="badge badge-info"
                                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                                        >
                                            {emp.full_name} ({emp.employee_code})
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted">لا يوجد موظفون معيّنون لهذا المنصب</p>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
}
