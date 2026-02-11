"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, Button, showToast, ActionButtons, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import type { Employee, EmployeeLoan } from "../types";

const loanTypeLabels: Record<string, string> = {
    salary_advance: "سلفة راتب", housing: "قرض إسكان", car: "قرض سيارة",
    personal: "قرض شخصي", other: "أخرى",
};
const statusLabels: Record<string, string> = {
    pending: "معلق", approved: "موافق عليه", active: "نشط",
    completed: "مكتمل", cancelled: "ملغي", defaulted: "متعثر",
};
const statusBadges: Record<string, string> = {
    pending: "badge-warning", approved: "badge-info", active: "badge-success",
    completed: "badge-secondary", cancelled: "badge-secondary", defaulted: "badge-danger",
};

export function EmployeeLoans() {
    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [totalRecords, setTotalRecords] = useState(0);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);
    const [form, setForm] = useState({
        employee_id: "", loan_type: "personal", loan_amount: "", interest_rate: "0",
        installment_count: "12", start_date: new Date().toISOString().split("T")[0],
        auto_deduction: true, notes: "",
    });

    useEffect(() => { loadEmployees(); }, []);
    useEffect(() => { loadLoans(); }, [currentPage, statusFilter]);

    const loadEmployees = async () => {
        try {
            const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
            setEmployees(res.data || (Array.isArray(res) ? res : []));
        } catch (e) { console.error(e); }
    };

    const loadLoans = async () => {
        setIsLoading(true);
        try {
            const q = new URLSearchParams({ page: currentPage.toString(), ...(statusFilter && { status: statusFilter }) });
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_LOANS.BASE}?${q}`);
            const data = res.data || (Array.isArray(res) ? res : []);
            setLoans(data); setTotalPages(Number(res.last_page) || 1); setTotalRecords(Number(res.total) || data.length);
        } catch (e) { console.error(e); showToast("فشل تحميل القروض", "error"); }
        finally { setIsLoading(false); }
    };

    const openCreate = () => {
        setForm({ employee_id: "", loan_type: "personal", loan_amount: "", interest_rate: "0", installment_count: "12", start_date: new Date().toISOString().split("T")[0], auto_deduction: true, notes: "" });
        setShowCreateDialog(true);
    };

    const handleSave = async () => {
        if (!form.employee_id || !form.loan_amount || !form.installment_count) { showToast("يرجى ملء جميع الحقول المطلوبة", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_LOANS.BASE, {
                method: "POST", body: JSON.stringify({
                    employee_id: Number(form.employee_id), loan_type: form.loan_type, loan_amount: Number(form.loan_amount),
                    interest_rate: Number(form.interest_rate) || 0, installment_count: Number(form.installment_count),
                    start_date: form.start_date, auto_deduction: form.auto_deduction, notes: form.notes || undefined,
                })
            });
            showToast("تم إنشاء القرض بنجاح", "success"); setShowCreateDialog(false); loadLoans();
        } catch (e: any) { showToast(e.message || "فشل إنشاء القرض", "error"); }
    };

    const openDetail = async (loan: EmployeeLoan) => {
        try { const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_LOANS.withId(loan.id)); setSelectedLoan(res.data || res); }
        catch { setSelectedLoan(loan); }
        setShowDetailDialog(true);
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_LOANS.STATUS(id), { method: "PUT", body: JSON.stringify({ status }) });
            showToast("تم تحديث حالة القرض", "success"); loadLoans();
        } catch (e: any) { showToast(e.message || "فشل تحديث الحالة", "error"); }
    };

    const handleRecordRepayment = async (loanId: number, repaymentId: number) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_LOANS.REPAYMENT(loanId, repaymentId), { method: "PUT", body: JSON.stringify({ paid_date: new Date().toISOString().split("T")[0] }) });
            showToast("تم تسجيل الدفعة بنجاح", "success"); openDetail({ id: loanId } as EmployeeLoan); loadLoans();
        } catch (e: any) { showToast(e.message || "فشل تسجيل الدفعة", "error"); }
    };

    const calcPreview = () => {
        const p = Number(form.loan_amount) || 0; const r = (Number(form.interest_rate) || 0) / 100 / 12; const n = Number(form.installment_count) || 1;
        return r > 0 ? (p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toFixed(2) : (p / n).toFixed(2);
    };

    const columns: Column<EmployeeLoan>[] = [
        { key: "loan_number", header: "رقم القرض", dataLabel: "رقم القرض" },
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (item) => item.employee?.full_name || "-" },
        { key: "loan_type", header: "النوع", dataLabel: "النوع", render: (item) => loanTypeLabels[item.loan_type] || item.loan_type },
        { key: "loan_amount", header: "المبلغ", dataLabel: "المبلغ", render: (item) => formatCurrency(item.loan_amount) },
        { key: "monthly_installment", header: "القسط", dataLabel: "القسط", render: (item) => formatCurrency(item.monthly_installment) },
        { key: "remaining_balance", header: "المتبقي", dataLabel: "المتبقي", render: (item) => formatCurrency(item.remaining_balance) },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (item) => <span className={`badge ${statusBadges[item.status] || "badge-secondary"}`}>{statusLabels[item.status] || item.status}</span> },
        {
            key: "id", header: "الإجراءات", dataLabel: "الإجراءات", render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "view",
                            onClick: () => openDetail(item)
                        },
                        {
                            icon: "check",
                            title: "موافقة",
                            variant: "success",
                            onClick: () => handleStatusUpdate(item.id, "approved"),
                            hidden: item.status !== "pending"
                        },
                        {
                            icon: "x",
                            title: "رفض",
                            variant: "delete",
                            onClick: () => handleStatusUpdate(item.id, "cancelled"),
                            hidden: item.status !== "pending"
                        }
                    ]}
                />
            )
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="القروض المالية للموظفين"
                titleIcon="hand-holding-usd"
                actions={
                    <>
                        <Select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            style={{ minWidth: "140px" }}
                            placeholder="جميع الحالات"
                            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label })).filter(o => ["pending", "active", "completed"].includes(o.value))}
                        />
                        <Button
                            variant="primary"
                            icon="plus"
                            onClick={openCreate}
                        >
                            طلب قرض
                        </Button>
                    </>
                }
            />
            <div className="sales-card compact" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div className="stat-card"><div className="stat-label">الإجمالي</div><div className="stat-value">{totalRecords}</div></div>
                    <div className="stat-card"><div className="stat-label">معلقة</div><div className="stat-value text-warning">{loans.filter(l => l.status === "pending").length}</div></div>
                    <div className="stat-card"><div className="stat-label">نشطة</div><div className="stat-value text-success">{loans.filter(l => l.status === "active").length}</div></div>
                    <div className="stat-card"><div className="stat-label">مكتملة</div><div className="stat-value text-info">{loans.filter(l => l.status === "completed").length}</div></div>
                </div>
            </div>
            <Table columns={columns} data={loans} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد قروض" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />

            {/* Create Dialog */}
            <Dialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="طلب قرض جديد" maxWidth="700px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary mb-1">الموظف *</Label>
                            <SearchableSelect options={employees.map(e => ({ value: e.id.toString(), label: e.full_name }))} value={form.employee_id} onChange={(v) => setForm(p => ({ ...p, employee_id: v?.toString() || "" }))} placeholder="اختر الموظف" />
                        </div>
                        <Select label="نوع القرض" value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value })} options={Object.entries(loanTypeLabels).map(([value, label]) => ({ value, label }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TextInput label="مبلغ القرض *" type="number" value={form.loan_amount} onChange={(e) => setForm({ ...form, loan_amount: e.target.value })} />
                        <TextInput label="الفائدة (%)" type="number" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
                        <TextInput label="عدد الأقساط *" type="number" value={form.installment_count} onChange={(e) => setForm({ ...form, installment_count: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput label="تاريخ البدء" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", paddingBottom: "1.25rem" }}>
                            <input type="checkbox" checked={form.auto_deduction} onChange={(e) => setForm({ ...form, auto_deduction: e.target.checked })} id="ad" />
                            <Label htmlFor="ad" className="text-secondary">خصم تلقائي</Label>
                        </div>
                    </div>
                    {form.loan_amount && form.installment_count && <div className="sales-card compact" style={{ background: "linear-gradient(135deg,#e0f2fe,#f0f9ff)", border: "1px solid #bae6fd", padding: "1rem" }}><strong>القسط الشهري التقديري:</strong> <span style={{ fontWeight: "bold", color: "var(--primary-color)" }}>{formatCurrency(Number(calcPreview()))}</span></div>}
                    <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowCreateDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog isOpen={showDetailDialog} onClose={() => setShowDetailDialog(false)} title="تفاصيل القرض" maxWidth="900px">
                {selectedLoan && <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><strong>رقم القرض:</strong> {selectedLoan.loan_number}</div><div><strong>الموظف:</strong> {selectedLoan.employee?.full_name || "-"}</div>
                        <div><strong>النوع:</strong> {loanTypeLabels[selectedLoan.loan_type] || selectedLoan.loan_type}</div><div><strong>المبلغ:</strong> {formatCurrency(selectedLoan.loan_amount)}</div>
                        <div><strong>القسط:</strong> {formatCurrency(selectedLoan.monthly_installment)}</div><div><strong>المتبقي:</strong> {formatCurrency(selectedLoan.remaining_balance)}</div>
                        <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedLoan.status]}`}>{statusLabels[selectedLoan.status]}</span></div>
                        <div><strong>البدء:</strong> {formatDate(selectedLoan.start_date)}</div><div><strong>الانتهاء:</strong> {formatDate(selectedLoan.end_date)}</div>
                    </div>
                    {selectedLoan.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button variant="primary" icon="check" onClick={() => handleStatusUpdate(selectedLoan.id, "approved")}>موافقة</Button>
                            <Button variant="secondary" icon="x" onClick={() => handleStatusUpdate(selectedLoan.id, "cancelled")}>رفض</Button>
                        </div>
                    )}
                    <div><h4 style={{ marginBottom: "0.5rem" }}>جدول السداد</h4>
                        {selectedLoan.repayments && selectedLoan.repayments.length > 0 ? <div style={{ maxHeight: "300px", overflowY: "auto" }}><table className="table" style={{ width: "100%", fontSize: "0.9rem" }}><thead><tr><th>#</th><th>الاستحقاق</th><th>المبلغ</th><th>أصل</th><th>فائدة</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
                            {selectedLoan.repayments.map(r => <tr key={r.id}><td>{r.installment_number}</td><td>{formatDate(r.due_date)}</td><td>{formatCurrency(r.amount)}</td><td>{formatCurrency(r.principal)}</td><td>{formatCurrency(r.interest)}</td><td><span className={`badge ${r.status === "paid" ? "badge-success" : "badge-warning"}`}>{r.status === "paid" ? "مدفوع" : "معلق"}</span></td><td>{r.status === "pending" && selectedLoan.status === "active" && (
                                <ActionButtons
                                    actions={[
                                        {
                                            icon: "check-circle",
                                            title: "تسجيل الدفعة",
                                            variant: "success",
                                            onClick: () => handleRecordRepayment(selectedLoan.id, r.id)
                                        }
                                    ]}
                                />
                            )}</td></tr>)}
                        </tbody></table></div> : <p style={{ color: "var(--text-muted)" }}>لا يوجد جدول سداد بعد.</p>}
                    </div>
                </div>}
            </Dialog>
        </div>
    );
}
