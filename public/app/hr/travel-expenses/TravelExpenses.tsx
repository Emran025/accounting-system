"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast, TabNavigation, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee, TravelRequest, TravelExpense } from "../types";

const requestStatusLabels: Record<string, string> = {
    draft: "مسودة",
    pending_approval: "بانتظار الموافقة",
    approved: "موافق عليه",
    rejected: "مرفوض",
    cancelled: "ملغي",
    completed: "مكتمل",
};

const requestStatusBadges: Record<string, string> = {
    draft: "badge-secondary",
    pending_approval: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    cancelled: "badge-secondary",
    completed: "badge-info",
};

const expenseTypeLabels: Record<string, string> = {
    flight: "طيران",
    hotel: "فندق",
    meal: "وجبات",
    transportation: "مواصلات",
    other: "أخرى",
};

const expenseStatusLabels: Record<string, string> = {
    pending: "معلق",
    submitted: "مقدم",
    approved: "موافق عليه",
    rejected: "مرفوض",
    reimbursed: "تم السداد",
};

const expenseStatusBadges: Record<string, string> = {
    pending: "badge-secondary",
    submitted: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    reimbursed: "badge-info",
};

export function TravelExpenses() {
    const [activeTab, setActiveTab] = useState("requests");
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();

    // Travel Requests state
    const [requests, setRequests] = useState<TravelRequest[]>([]);
    const [reqLoading, setReqLoading] = useState(false);
    const [reqPage, setReqPage] = useState(1);
    const [reqTotalPages, setReqTotalPages] = useState(1);
    const [reqStatusFilter, setReqStatusFilter] = useState("");
    const [reqTotal, setReqTotal] = useState(0);
    const [showReqDialog, setShowReqDialog] = useState(false);
    const [showReqDetails, setShowReqDetails] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
    const [reqForm, setReqForm] = useState({
        employee_id: "",
        destination: "",
        purpose: "",
        departure_date: new Date().toISOString().split("T")[0],
        return_date: "",
        estimated_cost: "",
        notes: "",
    });

    // Travel Expenses state
    const [expenses, setExpenses] = useState<TravelExpense[]>([]);
    const [expLoading, setExpLoading] = useState(false);
    const [expPage, setExpPage] = useState(1);
    const [expTotalPages, setExpTotalPages] = useState(1);
    const [expStatusFilter, setExpStatusFilter] = useState("");
    const [expTotal, setExpTotal] = useState(0);
    const [showExpDialog, setShowExpDialog] = useState(false);
    const [expForm, setExpForm] = useState({
        travel_request_id: "",
        employee_id: "",
        expense_type: "transportation",
        expense_date: new Date().toISOString().split("T")[0],
        amount: "",
        currency: "SAR",
        exchange_rate: "1",
        description: "",
        notes: "",
    });

    useEffect(() => { loadAllEmployees(); }, [loadAllEmployees]);
    useEffect(() => { loadRequests(); }, [reqPage, reqStatusFilter]);
    useEffect(() => { loadExpenses(); }, [expPage, expStatusFilter]);

    const loadRequests = async () => {
        setReqLoading(true);
        try {
            const q = new URLSearchParams({ page: reqPage.toString(), ...(reqStatusFilter && { status: reqStatusFilter }) });
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.TRAVEL.REQUESTS.BASE}?${q}`);
            const data = res.data || (Array.isArray(res) ? res : []);
            setRequests(data);
            setReqTotalPages(Number(res.last_page) || 1);
            setReqTotal(Number(res.total) || data.length);
        } catch (e) {
            console.error(e);
            showToast("فشل تحميل طلبات السفر", "error");
        } finally { setReqLoading(false); }
    };

    const loadExpenses = async () => {
        setExpLoading(true);
        try {
            const q = new URLSearchParams({ page: expPage.toString(), ...(expStatusFilter && { status: expStatusFilter }) });
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.TRAVEL.EXPENSES.BASE}?${q}`);
            const data = res.data || (Array.isArray(res) ? res : []);
            setExpenses(data);
            setExpTotalPages(Number(res.last_page) || 1);
            setExpTotal(Number(res.total) || data.length);
        } catch (e) {
            console.error(e);
            showToast("فشل تحميل المصروفات", "error");
        } finally { setExpLoading(false); }
    };

    // ── Travel Request CRUD ──
    const openNewRequest = () => {
        setReqForm({
            employee_id: "", destination: "", purpose: "",
            departure_date: new Date().toISOString().split("T")[0],
            return_date: "", estimated_cost: "", notes: "",
        });
        setShowReqDialog(true);
    };

    const handleSaveRequest = async () => {
        if (!reqForm.employee_id || !reqForm.destination || !reqForm.purpose || !reqForm.return_date) {
            showToast("يرجى ملء جميع الحقول المطلوبة", "error");
            return;
        }
        try {
            await fetchAPI(API_ENDPOINTS.HR.TRAVEL.REQUESTS.BASE, {
                method: "POST",
                body: JSON.stringify({
                    employee_id: Number(reqForm.employee_id),
                    destination: reqForm.destination,
                    purpose: reqForm.purpose,
                    departure_date: reqForm.departure_date,
                    return_date: reqForm.return_date,
                    estimated_cost: reqForm.estimated_cost ? Number(reqForm.estimated_cost) : undefined,
                    notes: reqForm.notes || undefined,
                }),
            });
            showToast("تم إنشاء طلب السفر بنجاح", "success");
            setShowReqDialog(false);
            loadRequests();
        } catch (e: any) {
            showToast(e.message || "فشل حفظ طلب السفر", "error");
        }
    };

    const handleUpdateRequestStatus = async (id: number, status: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.TRAVEL.REQUESTS.STATUS(id), {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            showToast("تم تحديث حالة الطلب", "success");
            loadRequests();
        } catch (e: any) {
            showToast(e.message || "فشل تحديث الحالة", "error");
        }
    };

    // ── Travel Expense CRUD ──
    const openNewExpense = () => {
        setExpForm({
            travel_request_id: "", employee_id: "", expense_type: "transportation",
            expense_date: new Date().toISOString().split("T")[0],
            amount: "", currency: "SAR", exchange_rate: "1", description: "", notes: "",
        });
        setShowExpDialog(true);
    };

    const handleSaveExpense = async () => {
        if (!expForm.employee_id || !expForm.amount) {
            showToast("يرجى اختيار الموظف وإدخال المبلغ", "error");
            return;
        }
        try {
            await fetchAPI(API_ENDPOINTS.HR.TRAVEL.EXPENSES.BASE, {
                method: "POST",
                body: JSON.stringify({
                    travel_request_id: expForm.travel_request_id ? Number(expForm.travel_request_id) : undefined,
                    employee_id: Number(expForm.employee_id),
                    expense_type: expForm.expense_type,
                    expense_date: expForm.expense_date,
                    amount: Number(expForm.amount),
                    currency: expForm.currency,
                    exchange_rate: Number(expForm.exchange_rate) || 1,
                    description: expForm.description || undefined,
                    notes: expForm.notes || undefined,
                }),
            });
            showToast("تم تسجيل المصروف بنجاح", "success");
            setShowExpDialog(false);
            loadExpenses();
        } catch (e: any) {
            showToast(e.message || "فشل حفظ المصروف", "error");
        }
    };

    const handleUpdateExpenseStatus = async (id: number, status: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.TRAVEL.EXPENSES.STATUS(id), {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            showToast("تم تحديث حالة المصروف", "success");
            loadExpenses();
        } catch (e: any) {
            showToast(e.message || "فشل تحديث الحالة", "error");
        }
    };

    // ── Columns ──
    const requestColumns: Column<TravelRequest>[] = [
        { key: "request_number", header: "رقم الطلب", dataLabel: "رقم الطلب" },
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (item) => item.employee?.full_name || "-" },
        { key: "destination", header: "الوجهة", dataLabel: "الوجهة" },
        { key: "departure_date", header: "المغادرة", dataLabel: "المغادرة", render: (item) => formatDate(item.departure_date) },
        { key: "return_date", header: "العودة", dataLabel: "العودة", render: (item) => formatDate(item.return_date) },
        {
            key: "estimated_cost", header: "التكلفة التقديرية", dataLabel: "التكلفة التقديرية",
            render: (item) => item.estimated_cost ? formatCurrency(item.estimated_cost) : "-"
        },
        {
            key: "status", header: "الحالة", dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${requestStatusBadges[item.status] || "badge-secondary"}`}>
                    {requestStatusLabels[item.status] || item.status}
                </span>
            ),
        },
        {
            key: "id", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "عرض التفاصيل",
                            variant: "view",
                            onClick: () => { setSelectedRequest(item); setShowReqDetails(true); }
                        },
                        {
                            icon: "send",
                            title: "إرسال للموافقة",
                            variant: "edit",
                            onClick: () => handleUpdateRequestStatus(item.id, "pending_approval"),
                            hidden: item.status !== "draft"
                        },
                        {
                            icon: "check",
                            title: "موافقة",
                            variant: "success",
                            onClick: () => handleUpdateRequestStatus(item.id, "approved"),
                            hidden: item.status !== "pending_approval"
                        },
                        {
                            icon: "x",
                            title: "رفض",
                            variant: "delete",
                            onClick: () => handleUpdateRequestStatus(item.id, "rejected"),
                            hidden: item.status !== "pending_approval"
                        }
                    ]}
                />
            ),
        },
    ];

    const expenseColumns: Column<TravelExpense>[] = [
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (item) => item.employee?.full_name || "-" },
        {
            key: "expense_type", header: "نوع المصروف", dataLabel: "نوع المصروف",
            render: (item) => expenseTypeLabels[item.expense_type] || item.expense_type
        },
        { key: "expense_date", header: "التاريخ", dataLabel: "التاريخ", render: (item) => formatDate(item.expense_date) },
        {
            key: "amount", header: "المبلغ", dataLabel: "المبلغ",
            render: (item) => `${formatCurrency(item.amount)} ${item.currency}`
        },
        {
            key: "travel_request", header: "طلب السفر", dataLabel: "طلب السفر",
            render: (item) => item.travel_request?.request_number || "-"
        },
        {
            key: "status", header: "الحالة", dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${expenseStatusBadges[item.status] || "badge-secondary"}`}>
                    {expenseStatusLabels[item.status] || item.status}
                </span>
            ),
        },
        {
            key: "id", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "send",
                            title: "تقديم",
                            variant: "edit",
                            onClick: () => handleUpdateExpenseStatus(item.id, "submitted"),
                            hidden: item.status !== "pending"
                        },
                        {
                            icon: "check",
                            title: "موافقة",
                            variant: "success",
                            onClick: () => handleUpdateExpenseStatus(item.id, "approved"),
                            hidden: item.status !== "submitted"
                        },
                        {
                            icon: "x",
                            title: "رفض",
                            variant: "delete",
                            onClick: () => handleUpdateExpenseStatus(item.id, "rejected"),
                            hidden: item.status !== "submitted"
                        },
                        {
                            icon: "banknote",
                            title: "تسديد",
                            variant: "view",
                            onClick: () => handleUpdateExpenseStatus(item.id, "reimbursed"),
                            hidden: item.status !== "approved"
                        }
                    ]}
                />
            ),
        },
    ];

    const tabs = [
        { key: "requests", label: "طلبات السفر", icon: "plane" },
        { key: "expenses", label: "المصروفات", icon: "receipt" },
    ];

    return (
        <div className="sales-card animate-fade">
            <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>{getIcon("plane")} السفر والمصروفات</h3>
                </div>
            </div>

            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "requests" && (
                <>
                    {/* Stats */}
                    <div className="sales-card compact" style={{ marginBottom: "1.5rem", marginTop: "1rem", background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)", border: "1px solid #bfdbfe" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                            <div className="stat-card"><div className="stat-label">إجمالي الطلبات</div><div className="stat-value">{reqTotal}</div></div>
                            <div className="stat-card"><div className="stat-label">مسودة</div><div className="stat-value text-secondary">{requests.filter(r => r.status === "draft").length}</div></div>
                            <div className="stat-card"><div className="stat-label">بانتظار الموافقة</div><div className="stat-value text-warning">{requests.filter(r => r.status === "pending_approval").length}</div></div>
                            <div className="stat-card"><div className="stat-label">موافق عليها</div><div className="stat-value text-success">{requests.filter(r => r.status === "approved").length}</div></div>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", justifyContent: "flex-end", alignItems: "center" }}>
                        <Select
                            value={reqStatusFilter}
                            onChange={(e) => { setReqStatusFilter(e.target.value); setReqPage(1); }}
                            style={{ minWidth: "160px" }}
                            placeholder="جميع الحالات"
                            options={Object.entries(requestStatusLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <Button
                            onClick={openNewRequest}
                            variant="primary"
                            icon="plus"
                        >
                            طلب سفر جديد
                        </Button>
                    </div>

                    <Table columns={requestColumns} data={requests} keyExtractor={(item) => item.id.toString()} emptyMessage="لا توجد طلبات سفر مسجلة" isLoading={reqLoading}
                        pagination={{ currentPage: reqPage, totalPages: reqTotalPages, onPageChange: setReqPage }} />
                </>
            )}

            {activeTab === "expenses" && (
                <>
                    <div className="sales-card compact" style={{ marginBottom: "1.5rem", marginTop: "1rem", background: "linear-gradient(135deg, #fef9c3 0%, #fefce8 100%)", border: "1px solid #fde68a" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                            <div className="stat-card"><div className="stat-label">إجمالي المصروفات</div><div className="stat-value">{expTotal}</div></div>
                            <div className="stat-card"><div className="stat-label">معلقة</div><div className="stat-value text-warning">{expenses.filter(e => e.status === "pending" || e.status === "submitted").length}</div></div>
                            <div className="stat-card"><div className="stat-label">تم السداد</div><div className="stat-value text-success">{expenses.filter(e => e.status === "reimbursed").length}</div></div>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", justifyContent: "flex-end", alignItems: "center" }}>
                        <Select
                            value={expStatusFilter}
                            onChange={(e) => { setExpStatusFilter(e.target.value); setExpPage(1); }}
                            style={{ minWidth: "160px" }}
                            placeholder="جميع الحالات"
                            options={Object.entries(expenseStatusLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <Button onClick={openNewExpense} className="btn-primary"><i className="fas fa-plus"></i> تسجيل مصروف</Button>
                    </div>

                    <Table columns={expenseColumns} data={expenses} keyExtractor={(item) => item.id.toString()} emptyMessage="لا توجد مصروفات مسجلة" isLoading={expLoading}
                        pagination={{ currentPage: expPage, totalPages: expTotalPages, onPageChange: setExpPage }} />
                </>
            )}

            {/* New Travel Request Dialog */}
            <Dialog isOpen={showReqDialog} onClose={() => setShowReqDialog(false)} title="طلب سفر جديد" maxWidth="700px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الموظف *</Label>
                            <SearchableSelect options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: emp.full_name }))}
                                value={reqForm.employee_id} onChange={(val) => setReqForm(prev => ({ ...prev, employee_id: val?.toString() || "" }))} placeholder="اختر الموظف" />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الوجهة *</Label>
                            <TextInput value={reqForm.destination} onChange={(e) => setReqForm({ ...reqForm, destination: e.target.value })} placeholder="مثال: الرياض - جدة" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تاريخ المغادرة *</Label>
                            <TextInput type="date" value={reqForm.departure_date} onChange={(e) => setReqForm({ ...reqForm, departure_date: e.target.value })} />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تاريخ العودة *</Label>
                            <TextInput type="date" value={reqForm.return_date} onChange={(e) => setReqForm({ ...reqForm, return_date: e.target.value })} />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>التكلفة التقديرية</Label>
                            <TextInput type="number" value={reqForm.estimated_cost} onChange={(e) => setReqForm({ ...reqForm, estimated_cost: e.target.value })} placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الغرض من السفر *</Label>
                        <Textarea value={reqForm.purpose} onChange={(e) => setReqForm({ ...reqForm, purpose: e.target.value })} rows={3} />
                    </div>
                    <div>
                        <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>ملاحظات</Label>
                        <Textarea value={reqForm.notes} onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })} rows={2} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                        <Button variant="secondary" onClick={() => setShowReqDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleSaveRequest} icon="save">حفظ</Button>
                    </div>
                </div>
            </Dialog>

            {/* Request Details Dialog */}
            <Dialog isOpen={showReqDetails} onClose={() => setShowReqDetails(false)} title="تفاصيل طلب السفر" maxWidth="700px">
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><strong>رقم الطلب:</strong> {selectedRequest.request_number}</div>
                            <div><strong>الموظف:</strong> {selectedRequest.employee?.full_name || "-"}</div>
                            <div><strong>الوجهة:</strong> {selectedRequest.destination}</div>
                            <div><strong>الحالة:</strong>{" "}
                                <span className={`badge ${requestStatusBadges[selectedRequest.status] || "badge-secondary"}`}>
                                    {requestStatusLabels[selectedRequest.status] || selectedRequest.status}
                                </span>
                            </div>
                            <div><strong>المغادرة:</strong> {formatDate(selectedRequest.departure_date)}</div>
                            <div><strong>العودة:</strong> {formatDate(selectedRequest.return_date)}</div>
                            {selectedRequest.estimated_cost && <div><strong>التكلفة التقديرية:</strong> {formatCurrency(selectedRequest.estimated_cost)}</div>}
                        </div>
                        <div><strong>الغرض:</strong><p style={{ marginTop: "0.5rem" }}>{selectedRequest.purpose}</p></div>
                        {selectedRequest.notes && <div><strong>ملاحظات:</strong><p style={{ marginTop: "0.5rem" }}>{selectedRequest.notes}</p></div>}
                        {selectedRequest.rejection_reason && <div><strong>سبب الرفض:</strong><p style={{ marginTop: "0.5rem", color: "var(--danger-color)" }}>{selectedRequest.rejection_reason}</p></div>}
                    </div>
                )}
            </Dialog>

            {/* New Expense Dialog */}
            <Dialog isOpen={showExpDialog} onClose={() => setShowExpDialog(false)} title="تسجيل مصروف جديد" maxWidth="700px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الموظف *</Label>
                            <SearchableSelect options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: emp.full_name }))}
                                value={expForm.employee_id} onChange={(val) => setExpForm(prev => ({ ...prev, employee_id: val?.toString() || "" }))} placeholder="اختر الموظف" />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>نوع المصروف</Label>
                            <Select
                                value={expForm.expense_type}
                                onChange={(e) => setExpForm({ ...expForm, expense_type: e.target.value })}
                                options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>المبلغ *</Label>
                            <TextInput type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0.00" />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>العملة</Label>
                            <TextInput value={expForm.currency} onChange={(e) => setExpForm({ ...expForm, currency: e.target.value })} placeholder="SAR" />
                        </div>
                        <div>
                            <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تاريخ المصروف</Label>
                            <TextInput type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الوصف</Label>
                        <Textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} rows={2} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                        <Button variant="secondary" onClick={() => setShowExpDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleSaveExpense} icon="save">حفظ</Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
