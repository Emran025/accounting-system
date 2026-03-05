"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import {
    ActionButtons, Table, Dialog, ConfirmDialog, Button, Column, showAlert,
    SearchableSelect, NumberInput, KPICardRow, SegmentedToggle
} from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, canAccess, getStoredPermissions, Permission, checkAuth } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────
interface CostCenter {
    id: number;
    code: string;
    name: string;
    name_en?: string;
    parent_id: number | null;
    parent_name?: string;
    account_id: number | null;
    account_name?: string;
    manager_id: number | null;
    manager_name?: string;
    budget: number | null;
    actual_cost: number;
    budget_utilization: number;
    type: string;
    description?: string;
    is_active: boolean;
    children_count: number;
    recorder_name?: string;
    created_at: string;
    structure_node_uuid?: string;
}

interface Account {
    id: number;
    account_code: string;
    account_name: string;
}

interface Employee {
    id: number;
    name: string;
}

interface Summary {
    cost_centers_count: number;
    profit_centers_count: number;
    total_budget: number;
    total_actual_cost: number;
    budget_utilization: number;
    total_revenue: number;
    total_expense: number;
    net_profit: number;
}

// ── Type translations ────────────────────────────────────────────────
const TYPE_MAP: Record<string, string> = {
    operational: "تشغيلي",
    administrative: "إداري",
    production: "إنتاجي",
    support: "دعم",
};

const TYPE_OPTIONS = [
    { value: "operational", label: "تشغيلي" },
    { value: "administrative", label: "إداري" },
    { value: "production", label: "إنتاجي" },
    { value: "support", label: "دعم" },
];

const TYPE_COLORS: Record<string, string> = {
    operational: "badge-primary",
    administrative: "badge-warning",
    production: "badge-success",
    support: "badge-secondary",
};

// ═══════════════════════════════════════════════════════════════════════
export default function CostCentersPage() {
    // ── Auth state ────────────────────────────────────────────
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // ── Data state ────────────────────────────────────────────
    const [centers, setCenters] = useState<CostCenter[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

    // ── Pagination & loading ──────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");

    // ── Dialog state ──────────────────────────────────────────
    const [formDialog, setFormDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // ── Form state ────────────────────────────────────────────
    const [editId, setEditId] = useState<number | null>(null);
    const [formCode, setFormCode] = useState("");
    const [formName, setFormName] = useState("");
    const [formNameEn, setFormNameEn] = useState("");
    const [formParentId, setFormParentId] = useState<string>("");
    const [formAccountId, setFormAccountId] = useState<string>("");
    const [formManagerId, setFormManagerId] = useState<string>("");
    const [formBudget, setFormBudget] = useState("");
    const [formType, setFormType] = useState("operational");
    const [formDescription, setFormDescription] = useState("");
    const [formIsActive, setFormIsActive] = useState("true");

    const itemsPerPage = 20;

    // ── Loaders ───────────────────────────────────────────────
    const loadCenters = useCallback(async (page: number = 1, search: string = "", type: string = "all") => {
        try {
            setIsLoading(true);
            let url = `${API_ENDPOINTS.FINANCE.COST_CENTERS.BASE}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`;
            if (type !== "all") url += `&type=${type}`;

            const response = await fetchAPI(url);
            if (response.success && response.data) {
                setCenters(response.data as CostCenter[]);
                const pagination = response.pagination as { total_records?: number } | undefined;
                const total = Number(pagination?.total_records) || (response.data as CostCenter[]).length;
                setTotalPages(Math.ceil(total / itemsPerPage));
                setCurrentPage(page);
            } else {
                showAlert("alert-container", response.message || "فشل تحميل مراكز التكلفة", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadLookups = useCallback(async () => {
        try {
            const [accountsRes, employeesRes, summaryRes] = await Promise.all([
                fetchAPI(`${API_ENDPOINTS.FINANCE.ACCOUNTS.BASE}?limit=500`),
                fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?limit=500&status=active`),
                fetchAPI(API_ENDPOINTS.FINANCE.CENTERS_SUMMARY),
            ]);
            if (accountsRes.success && accountsRes.data) setAccounts(accountsRes.data as Account[]);
            if (employeesRes.success && employeesRes.data) setEmployees(employeesRes.data as Employee[]);
            if (summaryRes.success) setSummary(summaryRes as unknown as Summary);
        } catch { /* non-critical */ }
    }, []);

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            await Promise.all([loadCenters(), loadLookups()]);
        };
        init();
    }, [loadCenters, loadLookups]);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => loadCenters(1, searchTerm, filterType), 400);
        return () => clearTimeout(timer);
    }, [searchTerm, filterType, loadCenters]);

    // ── Helpers ───────────────────────────────────────────────
    const getUtilizationColor = (pct: number) => {
        if (pct >= 100) return "#ef4444";
        if (pct >= 80) return "#f59e0b";
        return "#10b981";
    };

    // ── Open/Close centre (SAP-style) ────────────────────────
    const toggleCenterStatus = async (id: number, currentlyActive: boolean) => {
        try {
            const endpoint = currentlyActive
                ? API_ENDPOINTS.SYSTEM.ORG_INTEGRATION.CLOSE_CENTER
                : API_ENDPOINTS.SYSTEM.ORG_INTEGRATION.OPEN_CENTER;

            const response = await fetchAPI(endpoint, {
                method: "POST",
                body: JSON.stringify({ type: "cost", id }),
            });

            if (response.success) {
                showAlert(
                    "alert-container",
                    currentlyActive ? "تم إغلاق المركز وتحديث الهيكل التنظيمي" : "تم فتح المركز وتحديث الهيكل التنظيمي",
                    "success"
                );
                await Promise.all([loadCenters(currentPage, searchTerm, filterType), loadLookups()]);
            } else {
                showAlert("alert-container", response.message || "فشل تغيير حالة المركز", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في الاتصال", "error");
        }
    };

    // ── Dialog handlers ──────────────────────────────────────
    const resetForm = () => {
        setEditId(null);
        setFormCode("");
        setFormName("");
        setFormNameEn("");
        setFormParentId("");
        setFormAccountId("");
        setFormManagerId("");
        setFormBudget("");
        setFormType("operational");
        setFormDescription("");
        setFormIsActive("true");
    };

    const openAddDialog = () => {
        resetForm();
        // Auto-generate next code
        const maxNum = centers.reduce((max, c) => {
            const num = parseInt(c.code.replace(/\D/g, "")) || 0;
            return num > max ? num : max;
        }, 0);
        setFormCode(`CC-${String(maxNum + 1).padStart(3, "0")}`);
        setFormDialog(true);
    };

    const openEditDialog = (id: number) => {
        const center = centers.find((c) => c.id === id);
        if (!center) return;
        setEditId(id);
        setFormCode(center.code);
        setFormName(center.name);
        setFormNameEn(center.name_en || "");
        setFormParentId(center.parent_id ? String(center.parent_id) : "");
        setFormAccountId(center.account_id ? String(center.account_id) : "");
        setFormManagerId(center.manager_id ? String(center.manager_id) : "");
        setFormBudget(center.budget ? String(center.budget) : "");
        setFormType(center.type);
        setFormDescription(center.description || "");
        setFormIsActive(center.is_active ? "true" : "false");
        setFormDialog(true);
    };

    const saveCenter = async () => {
        if (!formCode || !formName) {
            showAlert("alert-container", "يرجى ملء الحقول المطلوبة (الكود والاسم)", "error");
            return;
        }

        try {
            const method = editId ? "PUT" : "POST";
            const url = editId
                ? API_ENDPOINTS.FINANCE.COST_CENTERS.withId(editId)
                : API_ENDPOINTS.FINANCE.COST_CENTERS.BASE;

            const body: Record<string, unknown> = {
                code: formCode,
                name: formName,
                name_en: formNameEn || null,
                parent_id: formParentId ? parseInt(formParentId) : null,
                account_id: formAccountId ? parseInt(formAccountId) : null,
                manager_id: formManagerId ? parseInt(formManagerId) : null,
                budget: formBudget ? parseFloat(formBudget) : null,
                type: formType,
                description: formDescription || null,
                is_active: formIsActive === "true",
            };

            const response = await fetchAPI(url, {
                method,
                body: JSON.stringify(body),
            });

            if (response.success) {
                showAlert("alert-container", editId ? "تم تحديث مركز التكلفة" : "تم إنشاء مركز التكلفة", "success");
                setFormDialog(false);
                resetForm();
                await Promise.all([loadCenters(currentPage, searchTerm, filterType), loadLookups()]);
            } else {
                showAlert("alert-container", response.message || "فشل الحفظ", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
        }
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
        setConfirmDialog(true);
    };

    const deleteCenter = async () => {
        if (!deleteId) return;
        try {
            const response = await fetchAPI(API_ENDPOINTS.FINANCE.COST_CENTERS.withId(deleteId), { method: "DELETE" });
            if (response.success) {
                showAlert("alert-container", "تم حذف مركز التكلفة", "success");
                setConfirmDialog(false);
                setDeleteId(null);
                await Promise.all([loadCenters(currentPage, searchTerm, filterType), loadLookups()]);
            } else {
                showAlert("alert-container", response.message || "فشل الحذف", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في الحذف", "error");
        }
    };

    // ── Table columns ────────────────────────────────────────
    const columns: Column<CostCenter>[] = [
        {
            key: "code",
            header: "الكود",
            dataLabel: "الكود",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary)" }}>
                    {item.code}
                </span>
            ),
        },
        {
            key: "name",
            header: "الاسم",
            dataLabel: "الاسم",
            render: (item) => (
                <div>
                    <strong>{item.name}</strong>
                    {item.name_en && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.name_en}</div>}
                </div>
            ),
        },
        {
            key: "type",
            header: "النوع",
            dataLabel: "النوع",
            render: (item) => (
                <span className={`badge ${TYPE_COLORS[item.type] || "badge-secondary"}`}>
                    {TYPE_MAP[item.type] || item.type}
                </span>
            ),
        },
        {
            key: "parent_name",
            header: "المركز الأب",
            dataLabel: "المركز الأب",
            render: (item) => item.parent_name ? (
                <span className="badge badge-secondary">{item.parent_name}</span>
            ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>— رئيسي</span>
            ),
        },
        {
            key: "budget",
            header: "الميزانية",
            dataLabel: "الميزانية",
            render: (item) => item.budget ? formatCurrency(item.budget) : "—",
        },
        {
            key: "actual_cost",
            header: "التكاليف الفعلية",
            dataLabel: "التكاليف الفعلية",
            render: (item) => (
                <span style={{ color: item.actual_cost > 0 ? "#ef4444" : "var(--text-muted)" }}>
                    {formatCurrency(item.actual_cost)}
                </span>
            ),
        },
        {
            key: "budget_utilization",
            header: "الاستخدام",
            dataLabel: "الاستخدام",
            render: (item) => {
                if (!item.budget) return <span style={{ color: "var(--text-muted)" }}>—</span>;
                const pct = item.budget_utilization;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{
                            width: "60px",
                            height: "6px",
                            borderRadius: "3px",
                            background: "var(--bg-tertiary)",
                            overflow: "hidden",
                        }}>
                            <div style={{
                                width: `${Math.min(pct, 100)}%`,
                                height: "100%",
                                borderRadius: "3px",
                                background: getUtilizationColor(pct),
                                transition: "width 0.3s ease",
                            }} />
                        </div>
                        <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: getUtilizationColor(pct),
                        }}>
                            {pct}%
                        </span>
                    </div>
                );
            },
        },
        {
            key: "is_active",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`badge ${item.is_active ? "badge-success" : "badge-danger"}`}>
                        {item.is_active ? "مفتوح" : "مغلق"}
                    </span>
                    {item.structure_node_uuid && (
                        <span
                            title="مرتبط بالهيكل التنظيمي"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                fontSize: "0.7rem",
                            }}
                        >
                            ✓
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: item.is_active ? "x-octagon" : "check-circle",
                            title: item.is_active ? "إغلاق المركز" : "فتح المركز",
                            variant: item.is_active ? "warning" : "success",
                            onClick: () => toggleCenterStatus(item.id, item.is_active),
                            hidden: !canAccess(permissions, "chart_of_accounts", "edit"),
                        },
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => openEditDialog(item.id),
                            hidden: !canAccess(permissions, "chart_of_accounts", "edit"),
                        },
                        {
                            icon: "trash",
                            title: "حذف",
                            variant: "delete",
                            onClick: () => confirmDelete(item.id),
                            hidden: !canAccess(permissions, "chart_of_accounts", "delete"),
                        },
                    ]}
                />
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────
    return (
        <MainLayout>
            <div id="alert-container"></div>

            {/* KPI Cards */}
            {summary && (
                <KPICardRow
                    KPICards={[
                        {
                            icon: "building",
                            label: "مراكز التكلفة النشطة",
                            value: summary.cost_centers_count,
                            color: "#3b82f6",
                            subtitle: "مركز تكلفة",
                        },
                        {
                            icon: "wallet",
                            label: "إجمالي الميزانيات",
                            value: summary.total_budget,
                            color: "#8b5cf6",
                            subtitle: formatCurrency(summary.total_budget),
                        },
                        {
                            icon: "credit-card",
                            label: "التكاليف الفعلية",
                            value: summary.total_actual_cost,
                            color: "#ef4444",
                            subtitle: formatCurrency(summary.total_actual_cost),
                        },
                        {
                            icon: "pie-chart",
                            label: "نسبة الاستخدام",
                            value: summary.budget_utilization,
                            color: getUtilizationColor(summary.budget_utilization),
                            subtitle: `${summary.budget_utilization}% من الميزانية`,
                        },
                    ]}
                />
            )}

            <div className="sales-card animate-fade">
                <PageSubHeader
                    user={user}
                    searchInput={
                        <SearchableSelect
                            placeholder="بحث بالكود أو الاسم..."
                            value={searchTerm}
                            options={centers.map((c) => ({ value: c.name, label: `${c.code} - ${c.name}` }))}
                            onChange={(val) => setSearchTerm(val?.toString() || "")}
                            onSearch={(term) => setSearchTerm(term)}
                            className="header-search-bar"
                            id="cost-center-search"
                        />
                    }
                    actions={
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                            <SegmentedToggle
                                options={[
                                    { value: "all", label: "الكل" },
                                    ...TYPE_OPTIONS,
                                ]}
                                value={filterType}
                                onChange={setFilterType}
                            />
                            {canAccess(permissions, "chart_of_accounts", "create") && (
                                <Button variant="primary" onClick={openAddDialog} icon="plus">
                                    مركز تكلفة جديد
                                </Button>
                            )}
                        </div>
                    }
                />

                <Table
                    columns={columns}
                    data={centers}
                    keyExtractor={(item) => item.id}
                    emptyMessage="لا توجد مراكز تكلفة مسجلة"
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: (page) => loadCenters(page, searchTerm, filterType),
                    }}
                />
            </div>

            {/* ── Add / Edit Dialog ─────────────────────────────────── */}
            <Dialog
                isOpen={formDialog}
                onClose={() => setFormDialog(false)}
                title={editId ? "تعديل مركز التكلفة" : "إضافة مركز تكلفة جديد"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setFormDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={saveCenter}>حفظ</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); saveCenter(); }}>
                    <div className="form-row">
                        <TextInput
                            label="الكود *"
                            id="cc-code"
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            required
                            className="flex-1"
                            placeholder="CC-001"
                        />
                        <Select
                            label="النوع"
                            id="cc-type"
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                            className="flex-1"
                            options={TYPE_OPTIONS}
                        />
                    </div>

                    <div className="form-row">
                        <TextInput
                            label="الاسم بالعربية *"
                            id="cc-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            required
                            className="flex-1"
                        />
                        <TextInput
                            label="الاسم بالإنجليزية"
                            id="cc-name-en"
                            value={formNameEn}
                            onChange={(e) => setFormNameEn(e.target.value)}
                            className="flex-1"
                        />
                    </div>

                    <div className="form-row">
                        <Select
                            label="المركز الأب"
                            id="cc-parent"
                            value={formParentId}
                            onChange={(e) => setFormParentId(e.target.value)}
                            className="flex-1"
                            options={[
                                { value: "", label: "— لا يوجد (مركز رئيسي)" },
                                ...centers
                                    .filter((c) => c.id !== editId)
                                    .map((c) => ({ value: String(c.id), label: `${c.code} - ${c.name}` })),
                            ]}
                        />
                        <Select
                            label="الحساب المرتبط"
                            id="cc-account"
                            value={formAccountId}
                            onChange={(e) => setFormAccountId(e.target.value)}
                            className="flex-1"
                            options={[
                                { value: "", label: "— بدون ربط" },
                                ...accounts.map((a) => ({ value: String(a.id), label: `${a.account_code} - ${a.account_name}` })),
                            ]}
                        />
                    </div>

                    <div className="form-row">
                        <Select
                            label="المدير المسؤول"
                            id="cc-manager"
                            value={formManagerId}
                            onChange={(e) => setFormManagerId(e.target.value)}
                            className="flex-1"
                            options={[
                                { value: "", label: "— بدون تعيين" },
                                ...employees.map((emp) => ({ value: String(emp.id), label: emp.name })),
                            ]}
                        />
                        <NumberInput
                            label="الميزانية"
                            id="cc-budget"
                            value={formBudget}
                            onChange={(val) => setFormBudget(val)}
                            min={0}
                            step={0.01}
                            className="flex-1"
                        />
                    </div>

                    <div className="form-row">
                        <Select
                            label="الحالة"
                            id="cc-status"
                            value={formIsActive}
                            onChange={(e) => setFormIsActive(e.target.value)}
                            className="flex-1"
                            options={[
                                { value: "true", label: "نشط" },
                                { value: "false", label: "غير نشط" },
                            ]}
                        />
                    </div>

                    <Textarea
                        label="الوصف"
                        id="cc-description"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                    />
                </form>
            </Dialog>

            {/* ── Confirm Delete Dialog ─────────────────────────────── */}
            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={deleteCenter}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف مركز التكلفة هذا؟ لا يمكن حذف مراكز مرتبطة بقيود محاسبية."
                confirmText="حذف"
                confirmVariant="danger"
            />
        </MainLayout>
    );
}
