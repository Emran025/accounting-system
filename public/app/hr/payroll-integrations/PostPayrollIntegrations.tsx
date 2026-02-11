"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, Button, showToast } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import type { PostPayrollIntegration } from "../types";

const integrationTypeLabels: Record<string, string> = { bank_file: "ملف بنكي", gl_entry: "قيود محاسبية", third_party_pay: "مدفوعات طرف ثالث", garnishment: "حجز راتب" };
const statusLabels: Record<string, string> = { pending: "معلق", processing: "قيد المعالجة", completed: "مكتمل", failed: "فشل", reconciled: "تمت المطابقة" };
const statusBadges: Record<string, string> = { pending: "badge-warning", processing: "badge-info", completed: "badge-success", failed: "badge-danger", reconciled: "badge-primary" };

export function PostPayrollIntegrations() {
    const [integrations, setIntegrations] = useState<PostPayrollIntegration[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PostPayrollIntegration | null>(null);
    const [payrollCycles, setPayrollCycles] = useState<any[]>([]);
    const [form, setForm] = useState({ payroll_cycle_id: "", integration_type: "bank_file", file_format: "", notes: "" });

    useEffect(() => { loadIntegrations(); }, [currentPage, statusFilter, typeFilter]);
    useEffect(() => { loadPayrollCycles(); }, []);

    const loadPayrollCycles = async () => {
        try { const r: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.CYCLES); setPayrollCycles(r.data || (Array.isArray(r) ? r : [])); } catch { }
    };

    const loadIntegrations = async () => {
        setIsLoading(true);
        try {
            const q = new URLSearchParams({ page: currentPage.toString(), ...(statusFilter && { status: statusFilter }), ...(typeFilter && { integration_type: typeFilter }) });
            const r: any = await fetchAPI(`${API_ENDPOINTS.HR.POST_PAYROLL.BASE}?${q}`);
            const d = r.data || (Array.isArray(r) ? r : []);
            setIntegrations(d); setTotalPages(Number(r.last_page) || 1);
        } catch { showToast("فشل تحميل التكاملات", "error"); }
        finally { setIsLoading(false); }
    };

    const handleCreate = async () => {
        if (!form.payroll_cycle_id || !form.integration_type) { showToast("يرجى اختيار الدورة والنوع", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.POST_PAYROLL.BASE, { method: "POST", body: JSON.stringify({ payroll_cycle_id: Number(form.payroll_cycle_id), integration_type: form.integration_type, file_format: form.file_format || undefined, notes: form.notes || undefined }) });
            showToast("تم إنشاء التكامل بنجاح", "success"); setShowCreateDialog(false); loadIntegrations();
        } catch (e: any) { showToast(e.message || "فشل الإنشاء", "error"); }
    };

    const handleProcess = async (id: number) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.POST_PAYROLL.PROCESS(id), { method: "POST" });
            showToast("تم بدء المعالجة", "success"); loadIntegrations();
        } catch (e: any) { showToast(e.message || "فشل المعالجة", "error"); }
    };

    const handleReconcile = async (id: number) => {
        const item = integrations.find(i => i.id === id);
        try {
            await fetchAPI(API_ENDPOINTS.HR.POST_PAYROLL.RECONCILE(id), { method: "POST", body: JSON.stringify({ reconciled_amount: item?.total_amount || 0 }) });
            showToast("تمت المطابقة بنجاح", "success"); loadIntegrations();
        } catch (e: any) { showToast(e.message || "فشل المطابقة", "error"); }
    };

    const columns: Column<PostPayrollIntegration>[] = [
        { key: "payroll_cycle", header: "دورة الرواتب", dataLabel: "الدورة", render: (i) => i.payroll_cycle?.cycle_name || `دورة #${i.payroll_cycle_id}` },
        { key: "integration_type", header: "النوع", dataLabel: "النوع", render: (i) => integrationTypeLabels[i.integration_type] || i.integration_type },
        { key: "total_amount", header: "المبلغ", dataLabel: "المبلغ", render: (i) => formatCurrency(i.total_amount) },
        { key: "transaction_count", header: "المعاملات", dataLabel: "المعاملات" },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status]}</span> },
        { key: "processed_at", header: "تاريخ المعالجة", dataLabel: "المعالجة", render: (i) => i.processed_at ? formatDate(i.processed_at) : "-" },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <div className="action-buttons">
                    <button className="icon-btn view" onClick={() => { setSelectedItem(i); setShowDetailDialog(true); }} title="تفاصيل"><i className="fas fa-eye"></i></button>
                    {i.status === "pending" && <button className="icon-btn" onClick={() => handleProcess(i.id)} title="معالجة" style={{ color: "var(--info-color)" }}><i className="fas fa-cog"></i></button>}
                    {i.status === "completed" && <button className="icon-btn" onClick={() => handleReconcile(i.id)} title="مطابقة" style={{ color: "var(--success-color)" }}><i className="fas fa-check-double"></i></button>}
                </div>
            )
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <div className="card-header-flex" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{getIcon("exchange-alt")} تكاملات ما بعد الرواتب</h3>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="form-select" style={{ minWidth: "140px" }}>
                        <option value="">جميع الأنواع</option><option value="bank_file">ملف بنكي</option><option value="gl_entry">قيود</option><option value="third_party_pay">طرف ثالث</option><option value="garnishment">حجز</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="form-select" style={{ minWidth: "140px" }}>
                        <option value="">جميع الحالات</option><option value="pending">معلق</option><option value="completed">مكتمل</option><option value="reconciled">تمت المطابقة</option><option value="failed">فشل</option>
                    </select>
                    <Button onClick={() => { setForm({ payroll_cycle_id: "", integration_type: "bank_file", file_format: "", notes: "" }); setShowCreateDialog(true); }} className="btn-primary"><i className="fas fa-plus"></i> تكامل جديد</Button>
                </div>
            </div>

            <div className="sales-card compact" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)", border: "1px solid #ddd6fe" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div className="stat-card"><div className="stat-label">الإجمالي</div><div className="stat-value">{integrations.length}</div></div>
                    <div className="stat-card"><div className="stat-label">معلقة</div><div className="stat-value text-warning">{integrations.filter(i => i.status === "pending").length}</div></div>
                    <div className="stat-card"><div className="stat-label">مكتملة</div><div className="stat-value text-success">{integrations.filter(i => i.status === "completed").length}</div></div>
                    <div className="stat-card"><div className="stat-label">تمت المطابقة</div><div className="stat-value text-info">{integrations.filter(i => i.status === "reconciled").length}</div></div>
                </div>
            </div>

            <Table columns={columns} data={integrations} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد تكاملات" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />

            {/* Create Dialog */}
            <Dialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="تكامل جديد" maxWidth="600px">
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>دورة الرواتب *</label>
                        <Select value={form.payroll_cycle_id} onChange={(e) => setForm({ ...form, payroll_cycle_id: e.target.value })}>
                            <option value="">اختر الدورة</option>{payrollCycles.map(c => <option key={c.id} value={c.id}>{c.cycle_name || `دورة #${c.id}`}</option>)}
                        </Select></div>
                    <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>نوع التكامل</label>
                        <Select value={form.integration_type} onChange={(e) => setForm({ ...form, integration_type: e.target.value })}>
                            <option value="bank_file">ملف بنكي (NACHA/SEPA)</option><option value="gl_entry">قيود محاسبية</option><option value="third_party_pay">مدفوعات طرف ثالث</option><option value="garnishment">حجز راتب</option>
                        </Select></div>
                    <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>ملاحظات</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowCreateDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleCreate} icon="save">إنشاء</Button></div>
                </div>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog isOpen={showDetailDialog} onClose={() => setShowDetailDialog(false)} title="تفاصيل التكامل" maxWidth="700px">
                {selectedItem && <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>دورة الرواتب:</strong> {selectedItem.payroll_cycle?.cycle_name || `#${selectedItem.payroll_cycle_id}`}</div>
                        <div><strong>النوع:</strong> {integrationTypeLabels[selectedItem.integration_type]}</div>
                        <div><strong>المبلغ:</strong> {formatCurrency(selectedItem.total_amount)}</div>
                        <div><strong>المعاملات:</strong> {selectedItem.transaction_count}</div>
                        <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedItem.status]}`}>{statusLabels[selectedItem.status]}</span></div>
                        {selectedItem.processed_at && <div><strong>تاريخ المعالجة:</strong> {formatDate(selectedItem.processed_at)}</div>}
                        {selectedItem.reconciled_at && <div><strong>تاريخ المطابقة:</strong> {formatDate(selectedItem.reconciled_at)}</div>}
                        {selectedItem.file_path && <div><strong>الملف:</strong> {selectedItem.file_path}</div>}
                        {selectedItem.error_message && <div style={{ color: "var(--danger-color)" }}><strong>خطأ:</strong> {selectedItem.error_message}</div>}
                    </div>
                    {selectedItem.notes && <div><strong>ملاحظات:</strong><p>{selectedItem.notes}</p></div>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        {selectedItem.status === "pending" && <Button variant="primary" onClick={() => { handleProcess(selectedItem.id); setShowDetailDialog(false); }}><i className="fas fa-cog"></i> معالجة</Button>}
                        {selectedItem.status === "completed" && <Button variant="primary" onClick={() => { handleReconcile(selectedItem.id); setShowDetailDialog(false); }}><i className="fas fa-check-double"></i> مطابقة</Button>}
                    </div>
                </div>}
            </Dialog>
        </div>
    );
}
