"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout";
import { Button, Table, Column, ActionButtons, ConfirmDialog } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { getIcon } from "@/lib/icons";
import { useNumberRange, NrObjectHeader, NrSetupPrompt, NrLoading } from "@/components/number-range";
import type { NrAssignment } from "@/components/number-range";

const EMP_CONFIG = { name: "الموظفين", name_en: "Employees", number_length: 8, prefix: "EMP-" };

export default function NumberRangeAssignmentPage() {
    const { objectData, isLoading, createObject, saveAssignment, deleteAssignment } = useNumberRange({ objectType: "employees" });

    // Assignment Form state
    const [assignGroupId, setAssignGroupId] = useState("");
    const [assignIntervalId, setAssignIntervalId] = useState("");

    // Delete Confirm state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleAssignSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (assignGroupId && assignIntervalId) {
            const ok = await saveAssignment(parseInt(assignGroupId), parseInt(assignIntervalId));
            if (ok) {
                setAssignGroupId("");
                setAssignIntervalId("");
            }
        }
    };

    const openDelete = (id: number) => {
        setDeleteId(id);
        setConfirmDelete(true);
    };

    const handleDelete = async () => {
        if (deleteId) {
            const ok = await deleteAssignment(deleteId);
            if (ok) setConfirmDelete(false);
        }
    };

    const assignmentColumns: Column<NrAssignment>[] = [
        {
            key: "group", header: "المجموعة", dataLabel: "المجموعة",
            render: (item) => (
                <div>
                    <span className="badge badge-secondary" style={{ fontFamily: "monospace", marginInlineEnd: "0.4rem" }}>
                        {item.group?.code}
                    </span>
                    {item.group?.name}
                </div>
            ),
        },
        {
            key: "interval", header: "النطاق", dataLabel: "النطاق",
            render: (item) => (
                <div style={{ fontFamily: "monospace" }}>
                    <span className="badge badge-primary" style={{ marginInlineEnd: "0.4rem" }}>
                        {item.interval?.code}
                    </span>
                    <span style={{ color: "#10b981" }}>{item.interval?.from_number?.toLocaleString()}</span>
                    <span style={{ color: "var(--text-muted)", padding: "0 0.25rem" }}>→</span>
                    <span style={{ color: "#3b82f6" }}>{item.interval?.to_number?.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: "actions", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons actions={[
                    { icon: "trash", title: "إلغاء الربط", variant: "delete", onClick: () => openDelete(item.id) },
                ]} />
            ),
        },
    ];

    if (isLoading) return <MainLayout><NrLoading /></MainLayout>;

    if (!objectData) {
        return (
            <MainLayout>
                <div className="page-header">
                    <h2>عرض وإضافة إسنادات نطاقات الترقيم</h2>
                </div>
                <NrSetupPrompt defaultConfig={EMP_CONFIG} onCreateObject={createObject} />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="page-header">
                <h2>عرض وإضافة إسنادات نطاقات الترقيم</h2>
            </div>

            <NrObjectHeader objectData={objectData} title="إعدادات ترقيم الموظفين" />

            {/* Assignment Form */}
            <div className="nr-tab-content">
                <div className="nr-section-header">
                    <h3>{getIcon("link")} ربط مجموعة بنطاق أرقام</h3>
                </div>

                <form onSubmit={handleAssignSave} style={{ maxWidth: "800px", marginTop: "1rem" }}>
                    <div id="nr-alert" style={{ marginBottom: "1rem" }} />

                    <div className="form-row" style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                        <Select
                            label="اختر المجموعة *"
                            id="assign-group"
                            value={assignGroupId}
                            onChange={(e) => setAssignGroupId(e.target.value)}
                            options={[
                                { value: "", label: "— اختر المجموعة —" },
                                ...(objectData.groups || []).map(g => ({ value: String(g.id), label: `${g.code} — ${g.name}` })),
                            ]}
                            className="flex-1"
                            required
                        />

                        <Select
                            label="اختر نطاق الأرقام *"
                            id="assign-interval"
                            value={assignIntervalId}
                            onChange={(e) => setAssignIntervalId(e.target.value)}
                            options={[
                                { value: "", label: "— اختر النطاق —" },
                                ...(objectData.intervals || []).map(iv => ({
                                    value: String(iv.id),
                                    label: `${iv.code} (${iv.from_number.toLocaleString()} → ${iv.to_number.toLocaleString()})`,
                                })),
                            ]}
                            className="flex-1"
                            required
                        />

                        <Button variant="primary" type="submit" icon="check" style={{ height: "42px", minWidth: "120px" }}>
                            حفظ الربط
                        </Button>
                    </div>
                </form>
            </div>

            {/* Assignments Table */}
            <div className="nr-tab-content">
                <div className="nr-section-header">
                    <h3>{getIcon("list")} جدول الإسنادات الحالية</h3>
                </div>

                <div id="nr-alert-table" style={{ marginBottom: "1rem" }} />

                <Table
                    columns={assignmentColumns}
                    data={objectData.assignments || []}
                    keyExtractor={(item) => item.id}
                    emptyMessage="لا توجد إسنادات حتى الآن — أضف ربطاً جديداً في الأعلى لبدء الترقيم التلقائي"
                />
            </div>

            {/* Confirm Unassign */}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => { setConfirmDelete(false); setDeleteId(null); }}
                onConfirm={handleDelete}
                title="إلغاء الإسناد"
                message="هل أنت متأكد من إلغاء الربط بين هذه المجموعة والنطاق؟ الموظفون الجدد من هذه المجموعة قد لا يحصلون على ترقيم."
                confirmText="إلغاء الربط"
                confirmVariant="danger"
            />
        </MainLayout>
    );
}
