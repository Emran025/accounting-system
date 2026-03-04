"use client";

import { useState, useEffect } from "react";
import { Button, Table, Column, Dialog, showToast, SearchableSelect, ActionButtons } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Position } from "@/app/hr/types";
import { PageSubHeader } from "@/components/layout";
import { getIcon } from "@/lib/icons";
import { Label } from "@/components/ui/Label";

interface EmployeeWithPosition {
    id: number;
    employee_code: string;
    full_name: string;
    department?: { name_ar: string };
    position_id?: number;
    position?: Position;
    role?: { role_name_ar: string; role_key: string };
    job_title?: { title_ar: string };
}

export function EmployeePositionTab() {
    const { canAccess } = useAuthStore();
    const { allEmployees, loadAllEmployees } = useEmployeeStore();
    const [positions, setPositions] = useState<Position[]>([]);
    const [showAssign, setShowAssign] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [selectedPositionId, setSelectedPositionId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [employeesWithPositions, setEmployeesWithPositions] = useState<EmployeeWithPosition[]>([]);
    const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await loadAllEmployees();
            const posRes = await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.BASE);
            setPositions((posRes as any).data || []);

            // Load employees with position details
            const empRes = await fetchAPI(
                `${API_ENDPOINTS.HR.EMPLOYEES.BASE}?per_page=999&with_position=1`
            );
            const empData = (empRes as any).data || (empRes as any).employees || [];
            setEmployeesWithPositions(empData);
        } catch {
            console.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedEmployeeId || !selectedPositionId) {
            showToast("يرجى اختيار كل من الموظف والمنصب", "error");
            return;
        }
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.ASSIGN, {
                method: "POST",
                body: JSON.stringify({
                    employee_id: Number(selectedEmployeeId),
                    position_id: Number(selectedPositionId),
                }),
            });
            showToast("تم تعيين الموظف للمنصب بنجاح - تم توريث الدور والصلاحيات تلقائياً", "success");
            setShowAssign(false);
            setSelectedEmployeeId("");
            setSelectedPositionId("");
            loadData();
        } catch (e: any) {
            showToast(e?.message || "فشل تعيين الموظف", "error");
        }
    };

    const handleUnassign = async (employeeId: number) => {
        if (!confirm("هل أنت متأكد من إلغاء تعيين هذا الموظف من المنصب؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.POSITIONS.UNASSIGN(employeeId), {
                method: "DELETE",
            });
            showToast("تم إلغاء تعيين الموظف", "success");
            loadData();
        } catch {
            showToast("فشل إلغاء التعيين", "error");
        }
    };

    // Filter employees
    const filteredEmployees = employeesWithPositions.filter((emp) => {
        if (filter === "assigned") return !!emp.position_id;
        if (filter === "unassigned") return !emp.position_id;
        return true;
    });

    const assignedCount = employeesWithPositions.filter((e) => e.position_id).length;
    const unassignedCount = employeesWithPositions.filter((e) => !e.position_id).length;

    // Get selected position details for the preview
    const selectedPosition = positions.find((p) => p.id.toString() === selectedPositionId);

    const columns: Column<EmployeeWithPosition>[] = [
        {
            key: "employee_code",
            header: "كود الموظف",
            dataLabel: "الكود",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{item.employee_code}</span>
            ),
        },
        { key: "full_name", header: "اسم الموظف", dataLabel: "الاسم" },
        {
            key: "department",
            header: "القسم",
            dataLabel: "القسم",
            render: (item) => <span>{item.department?.name_ar || "غير محدد"}</span>,
        },
        {
            key: "position",
            header: "المنصب",
            dataLabel: "المنصب",
            render: (item) =>
                item.position ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <span className="badge badge-info" style={{ fontSize: "0.8rem" }}>
                            {item.position.position_name_ar}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {item.position.position_code}
                        </span>
                    </div>
                ) : (
                    <span className="badge badge-warning">غير معيّن</span>
                ),
        },
        {
            key: "role",
            header: "الدور الموروث",
            dataLabel: "الدور",
            render: (item) =>
                item.position?.role ? (
                    <span className="badge badge-success" style={{ fontSize: "0.8rem" }}>
                        {item.position.role.role_name_ar || item.position.role.role_key}
                    </span>
                ) : item.role ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {item.role.role_name_ar || item.role.role_key}
                    </span>
                ) : (
                    <span className="text-muted">—</span>
                ),
        },
        {
            key: "job_title",
            header: "المسمى الوظيفي",
            dataLabel: "المسمى",
            render: (item) => (
                <span>
                    {item.position?.job_title?.title_ar || item.job_title?.title_ar || "—"}
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
                        ...(canAccess("employees", "edit") && !item.position_id
                            ? [
                                {
                                    icon: "link" as const,
                                    title: "تعيين لمنصب",
                                    variant: "view" as const,
                                    onClick: () => {
                                        setSelectedEmployeeId(item.id.toString());
                                        setSelectedPositionId("");
                                        setShowAssign(true);
                                    },
                                },
                            ]
                            : []),
                        ...(canAccess("employees", "edit") && item.position_id
                            ? [
                                {
                                    icon: "unlink" as const,
                                    title: "إلغاء التعيين",
                                    variant: "delete" as const,
                                    onClick: () => handleUnassign(item.id),
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
            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <button
                    className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter("all")}
                >
                    الكل ({employeesWithPositions.length})
                </button>
                <button
                    className={`btn btn-sm ${filter === "assigned" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter("assigned")}
                >
                    {getIcon("check-circle")} معيّنون ({assignedCount})
                </button>
                <button
                    className={`btn btn-sm ${filter === "unassigned" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter("unassigned")}
                >
                    {getIcon("alert-circle")} غير معيّنين ({unassignedCount})
                </button>
            </div>

            <PageSubHeader
                title="ربط الموظفين بالمناصب"
                titleIcon="users"
                actions={
                    <>
                        {canAccess("employees", "edit") && (
                            <Button
                                variant="primary"
                                icon="link"
                                onClick={() => {
                                    setSelectedEmployeeId("");
                                    setSelectedPositionId("");
                                    setShowAssign(true);
                                }}
                            >
                                تعيين موظف لمنصب
                            </Button>
                        )}
                    </>
                }
            />

            <Table
                columns={columns}
                data={filteredEmployees}
                keyExtractor={(i) => i.id.toString()}
                emptyMessage="لا توجد بيانات"
                isLoading={isLoading}
            />

            {/* Assign Dialog */}
            <Dialog
                isOpen={showAssign}
                onClose={() => setShowAssign(false)}
                title="تعيين موظف لمنصب وظيفي"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAssign(false)}>
                            إلغاء
                        </Button>
                        <Button
                            variant="primary"
                            icon="link"
                            onClick={handleAssign}
                            disabled={!selectedEmployeeId || !selectedPositionId}
                        >
                            تعيين
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div
                        className="alert alert-info"
                        style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
                    >
                        {getIcon("info")}
                        <div>
                            <strong>توريث تلقائي</strong>
                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
                                عند تعيين الموظف لمنصب، يتم تلقائياً:
                                <br />• توريث <strong>الدور الوظيفي</strong> وصلاحياته
                                <br />• تعيين <strong>المسمى الوظيفي</strong>
                                <br />• تحديد <strong>القسم</strong> المرتبط بالمنصب
                            </p>
                        </div>
                    </div>

                    <div className="form-group">
                        <Label>اختر الموظف *</Label>
                        <SearchableSelect
                            options={allEmployees
                                .filter((e: any) => !e.position_id)
                                .map((e: any) => ({
                                    value: e.id.toString(),
                                    label: `${e.full_name} (${e.employee_code})`,
                                }))}
                            value={selectedEmployeeId}
                            onChange={(val) => setSelectedEmployeeId(val?.toString() || "")}
                            placeholder="ابحث عن موظف غير معيّن..."
                        />
                    </div>

                    <div className="form-group">
                        <Label>اختر المنصب *</Label>
                        <SearchableSelect
                            options={positions
                                .filter((p) => p.is_active)
                                .map((p) => ({
                                    value: p.id.toString(),
                                    label: `${p.position_name_ar} (${p.position_code})`,
                                }))}
                            value={selectedPositionId}
                            onChange={(val) => setSelectedPositionId(val?.toString() || "")}
                            placeholder="ابحث عن منصب..."
                        />
                    </div>

                    {/* Position Preview */}
                    {selectedPosition && (
                        <div
                            className="sales-card"
                            style={{
                                padding: "1rem",
                                border: "1px solid var(--primary-light)",
                                borderRadius: "var(--border-radius)",
                            }}
                        >
                            <h4
                                style={{
                                    fontSize: "0.9rem",
                                    marginBottom: "0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    color: "var(--primary)",
                                }}
                            >
                                {getIcon("eye")} معاينة المنصب المحدد
                            </h4>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "0.5rem",
                                    fontSize: "0.85rem",
                                }}
                            >
                                <div>
                                    <span className="stat-label">المسمى الوظيفي</span>
                                    <p>{selectedPosition.job_title?.title_ar || "—"}</p>
                                </div>
                                <div>
                                    <span className="stat-label">الدور الوظيفي</span>
                                    <p>
                                        {selectedPosition.role ? (
                                            <span className="badge badge-info">
                                                {selectedPosition.role.role_name_ar || selectedPosition.role.role_key}
                                            </span>
                                        ) : (
                                            "غير محدد"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <span className="stat-label">القسم</span>
                                    <p>{selectedPosition.department?.name_ar || "غير محدد"}</p>
                                </div>
                                <div>
                                    <span className="stat-label">المستوى</span>
                                    <p>{selectedPosition.grade_level || "—"}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>
        </>
    );
}
