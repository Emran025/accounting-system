"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { Button, Table, Column, ActionButtons, ConfirmDialog, Dialog } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { getIcon } from "@/lib/icons";
import { useNumberRange, NrObjectHeader, NrSetupPrompt, NrLoading, DomainFullnessPanel, ExpansionLogsPanel } from "@/components/number-range";
import type { NrInterval } from "@/components/number-range";

const EMP_CONFIG = { name: "الموظفين", name_en: "Employees", number_length: 8, prefix: "EMP-" };

export default function ViewNumberRangeIntervalsPage() {
    const router = useRouter();
    const { objectData, isLoading, createObject, saveInterval, deleteInterval, expandInterval } = useNumberRange({ objectType: "employees" });

    // Expansion Dialog
    const [expandDialog, setExpandDialog] = useState(false);
    const [expandId, setExpandId] = useState<number | null>(null);
    const [expandNewTo, setExpandNewTo] = useState("");
    const [expandReason, setExpandReason] = useState("");

    // Expansion Logs Dialog
    const [logsDialog, setLogsDialog] = useState(false);
    const [logsId, setLogsId] = useState<number | null>(null);

    // Edit Dialog
    const [editDialog, setEditDialog] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [intCode, setIntCode] = useState("");
    const [intDesc, setIntDesc] = useState("");
    const [intExternal, setIntExternal] = useState("false");
    const [intFrom, setIntFrom] = useState("");
    const [intTo, setIntTo] = useState("");

    // Delete Confirm state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const openExpand = (iv: NrInterval) => {
        setExpandId(iv.id);
        setExpandNewTo("");
        setExpandReason("");
        setExpandDialog(true);
    };

    const handleExpandSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (expandId && expandNewTo) {
            const ok = await expandInterval(expandId, parseInt(expandNewTo), expandReason);
            if (ok) setExpandDialog(false);
        }
    };

    const openLogs = (id: number) => {
        setLogsId(id);
        setLogsDialog(true);
    };

    const openEdit = (iv: NrInterval) => {
        setEditId(iv.id);
        setIntCode(iv.code);
        setIntDesc(iv.description || "");
        setIntExternal(iv.is_external ? "true" : "false");
        setIntFrom(String(iv.from_number));
        setIntTo(String(iv.to_number));
        setEditDialog(true);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await saveInterval({ code: intCode, description: intDesc, is_external: intExternal === "true" }, editId);
        if (ok) setEditDialog(false);
    };

    const openDelete = (id: number) => {
        setDeleteId(id);
        setConfirmDelete(true);
    };

    const handleDelete = async () => {
        if (deleteId) {
            const ok = await deleteInterval(deleteId);
            if (ok) setConfirmDelete(false);
        }
    };

    const intervalColumns: Column<NrInterval>[] = [
        {
            key: "code", header: "الكود", dataLabel: "الكود",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary)" }}>
                    {item.code}
                </span>
            ),
        },
        {
            key: "range", header: "النطاق", dataLabel: "النطاق",
            render: (item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "monospace" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>{item.from_number.toLocaleString()}</span>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                    <span style={{ color: "#3b82f6", fontWeight: 600 }}>{item.to_number.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: "current", header: "الموضع الحالي", dataLabel: "الموضع",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: item.current_number > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {item.current_number > 0 ? item.current_number.toLocaleString() : "لم يبدأ"}
                </span>
            ),
        },
        {
            key: "fullness", header: "الامتلاء", dataLabel: "الامتلاء",
            render: (item) => {
                const color = item.status === "critical" ? "#ef4444" : item.status === "warning" ? "#f59e0b" : "#10b981";
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{
                            width: "80px", height: "8px", borderRadius: "4px",
                            background: "var(--bg-tertiary)", overflow: "hidden",
                        }}>
                            <div style={{
                                width: `${Math.min(item.fullness_percent, 100)}%`,
                                height: "100%", borderRadius: "4px",
                                background: color, transition: "width 0.4s ease",
                            }} />
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color, minWidth: "42px" }}>
                            {item.fullness_percent}%
                        </span>
                    </div>
                );
            },
        },
        {
            key: "remaining", header: "المتبقي", dataLabel: "المتبقي",
            render: (item) => (
                <span style={{ fontFamily: "monospace", color: item.remaining < 100 ? "#ef4444" : "var(--text-secondary)" }}>
                    {item.remaining.toLocaleString()}
                </span>
            ),
        },
        {
            key: "type", header: "النوع", dataLabel: "النوع",
            render: (item) => (
                <span className={`badge ${item.is_external ? "badge-warning" : "badge-primary"}`}>
                    {item.is_external ? "خارجي" : "داخلي"}
                </span>
            ),
        },
        {
            key: "actions", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons actions={[
                    { icon: "maximize-2", title: "توسيع النطاق", variant: "primary" as const, onClick: () => openExpand(item) },
                    { icon: "activity", title: "سجل التوسعات", variant: "view" as const, onClick: () => openLogs(item.id) },
                    { icon: "edit", title: "تعديل", variant: "edit", onClick: () => openEdit(item) },
                    { icon: "trash", title: "حذف", variant: "delete", onClick: () => openDelete(item.id), hidden: item.current_number > 0 },
                ]} />
            ),
        },
    ];

    if (isLoading) return <MainLayout><NrLoading /></MainLayout>;

    if (!objectData) {
        return (
            <MainLayout>
                <div className="page-header">
                    <h2>عرض نطاقات أرقام الموظفين</h2>
                </div>
                <NrSetupPrompt defaultConfig={EMP_CONFIG} onCreateObject={createObject} />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>عرض نطاقات أرقام الموظفين</h2>
                <Button variant="primary" icon="plus" onClick={() => router.push("/hr/groups-number-range-interval/employees/add-number-range-interval")}>
                    إضافة نطاق جديد
                </Button>
            </div>

            <NrObjectHeader objectData={objectData} title="إعدادات ترقيم الموظفين" />

            <div className="nr-tab-content" style={{ marginTop: "1rem" }}>
                <DomainFullnessPanel
                    intervals={objectData.intervals || []}
                    numberLength={objectData.number_length}
                    onExpand={openExpand}
                    onViewLogs={openLogs}
                />
            </div>

            <div className="nr-tab-content">
                <div className="nr-section-header">
                    <h3>{getIcon("hash")} جدول نطاقات الأرقام</h3>
                </div>

                <div id="nr-alert" style={{ marginBottom: "1rem" }} />

                <Table
                    columns={intervalColumns}
                    data={objectData.intervals || []}
                    keyExtractor={(item) => item.id}
                    emptyMessage="لا توجد نطاقات أرقام مسجلة حتى الآن."
                />
            </div>

            {/* Expand Dialog */}
            <Dialog
                isOpen={expandDialog}
                onClose={() => setExpandDialog(false)}
                title="توسيع نطاق الأرقام"
                maxWidth="480px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setExpandDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleExpandSave}>توسيع</Button>
                    </>
                }
            >
                <form onSubmit={handleExpandSave}>
                    <div className="nr-info-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                        <span className="nr-info-icon" style={{ color: "#f59e0b" }}>{getIcon("alert-triangle")}</span>
                        <span>عملية التوسيع لا يمكن التراجع عنها وسيتم تسجيلها في سجل التوسعات. يرجى التأكد من عدم إنشاء تداخل.</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <NumberInput label="الحد الأعلى الجديد *" id="expand-new-to" value={expandNewTo} onChange={setExpandNewTo} required min={1} />
                    </div>
                    <div className="form-group">
                        <Textarea label="سبب التوسيع" id="expand-reason" value={expandReason} onChange={(e) => setExpandReason(e.target.value)} rows={3} placeholder="أدخل سبب التوسيع للتوثيق الإلزامي..." />
                    </div>
                </form>
            </Dialog>

            {/* Expansion Logs Panel */}
            {logsDialog && logsId && (
                <ExpansionLogsPanel
                    intervalId={logsId}
                    isOpen={logsDialog}
                    onClose={() => setLogsDialog(false)}
                />
            )}

            {/* Edit Interval Dialog */}
            <Dialog
                isOpen={editDialog}
                onClose={() => setEditDialog(false)}
                title="تعديل النطاق"
                maxWidth="560px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleEditSave}>حفظ</Button>
                    </>
                }
            >
                <form onSubmit={handleEditSave}>
                    <div className="form-row" style={{ marginBottom: "1rem" }}>
                        <TextInput label="الكود *" id="edit-int-code" value={intCode} onChange={(e) => setIntCode(e.target.value)} required />
                        <Select
                            label="النوع"
                            id="edit-int-type"
                            value={intExternal}
                            onChange={(e) => setIntExternal(e.target.value)}
                            options={[{ value: "false", label: "داخلي" }, { value: "true", label: "خارجي" }]}
                        />
                    </div>
                    <div className="nr-info-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                        <span className="nr-info-icon" style={{ color: "#f59e0b" }}>{getIcon("alert-triangle")}</span>
                        <span>لا يمكنك تغيير القيم الرقمية للنطاق (من {intFrom} إلى {intTo}) من هنا. لتكبير النطاق، استخدم التوسيع من الجدول.</span>
                    </div>
                    <div className="form-group">
                        <Textarea label="الوصف" id="edit-int-desc" value={intDesc} onChange={(e) => setIntDesc(e.target.value)} rows={2} />
                    </div>
                </form>
            </Dialog>

            {/* Confirm Delete Interval */}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => { setConfirmDelete(false); setDeleteId(null); }}
                onConfirm={handleDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا النطاق؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="تأكيد الحذف"
                confirmVariant="danger"
            />
        </MainLayout>
    );
}
