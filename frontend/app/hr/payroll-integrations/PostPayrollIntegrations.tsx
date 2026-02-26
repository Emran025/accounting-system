"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import type { PostPayrollIntegration } from "../types";

const integrationTypeLabels: Record<string, string> = { bank_file: "ملف بنكي", gl_entry: "قيود محاسبية", third_party_pay: "مدفوعات طرف ثالث", garnishment: "حجز راتب" };
const statusLabels: Record<string, string> = { pending: "معلق", processing: "قيد المعالجة", completed: "مكتمل", failed: "فشل", reconciled: "تمت المطابقة" };
const statusBadges: Record<string, string> = { pending: "badge-warning", processing: "badge-info", completed: "badge-success", failed: "badge-danger", reconciled: "badge-primary" };

export function PostPayrollIntegrations() {
    const { canAccess } = useAuthStore();
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
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "view",
                            onClick: () => { setSelectedItem(i); setShowDetailDialog(true); }
                        },
                        ...(canAccess("payroll", "edit") ? [{
                            icon: "settings" as const,
                            title: "معالجة",
                            variant: "view" as const,
                            onClick: () => handleProcess(i.id),
                            hidden: i.status !== "pending"
                        }] : []),
                        ...(canAccess("payroll", "edit") ? [{
                            icon: "check-check" as const,
                            title: "مطابقة",
                            variant: "success" as const,
                            onClick: () => handleReconcile(i.id),
                            hidden: i.status !== "completed"
                        }] : [])
                    ]}
                />
            )
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="تكاملات ما بعد الرواتب"
                titleIcon="repeat"
                actions={
                    <>
                        <Select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                            style={{ minWidth: "140px" }}
                            placeholder="جميع الأنواع"
                            options={Object.entries(integrationTypeLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <Select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            style={{ minWidth: "140px" }}
                            placeholder="جميع الحالات"
                            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label })).filter(o => ["pending", "completed", "reconciled", "failed"].includes(o.value))}
                        />
                        {canAccess("payroll", "create") && (
                            <Button
                                onClick={() => { setForm({ payroll_cycle_id: "", integration_type: "bank_file", file_format: "", notes: "" }); setShowCreateDialog(true); }}
                                variant="primary"
                                icon="plus"
                            >
                                تكامل جديد
                            </Button>
                        )}
                    </>
                }
            />

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
                    <Select
                        label="دورة الرواتب *"
                        value={form.payroll_cycle_id}
                        onChange={(e) => setForm({ ...form, payroll_cycle_id: e.target.value })}
                        options={payrollCycles.map(c => ({ value: c.id, label: c.cycle_name || `دورة #${c.id}` }))}
                        placeholder="اختر الدورة"
                    />
                    <Select
                        label="نوع التكامل"
                        value={form.integration_type}
                        onChange={(e) => setForm({ ...form, integration_type: e.target.value })}
                        options={[
                            { value: 'bank_file', label: 'ملف بنكي (NACHA/SEPA)' },
                            { value: 'gl_entry', label: 'قيود محاسبية' },
                            { value: 'third_party_pay', label: 'مدفوعات طرف ثالث' },
                            { value: 'garnishment', label: 'حجز راتب' }
                        ]}
                    />
                    <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
                        {selectedItem.status === "pending" && <Button variant="primary" onClick={() => { handleProcess(selectedItem.id); setShowDetailDialog(false); }} icon="settings">معالجة</Button>}
                        {selectedItem.status === "completed" && <Button variant="primary" onClick={() => { handleReconcile(selectedItem.id); setShowDetailDialog(false); }} icon="check-check">مطابقة</Button>}
                    </div>
                </div>}
            </Dialog>
        </div>
    );
}
