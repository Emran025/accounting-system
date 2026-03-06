"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Dialog, ConfirmDialog, Button, showAlert, Table, Column, ActionButtons, TabNavigation, Tab } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { NumberInput } from "@/components/ui/NumberInput";
import { getIcon } from "@/lib/icons";
import { DomainFullnessPanel } from "./components/DomainFullnessPanel";
import { ExpansionLogsPanel } from "./components/ExpansionLogsPanel";
import type { NrObject, NrGroup, NrInterval, NrAssignment, NrObjectFull } from "./types";

// ══════════════════════════════════════════════════════════════
//  Props
// ══════════════════════════════════════════════════════════════

interface NumberRangeManagerProps {
    /** The entity type key must match a registered NR Object (e.g. "employees", "customers") */
    objectType: string;
    /** Arabic title to display */
    title?: string;
    /** Whether to show the initial object setup if none exists */
    allowObjectCreation?: boolean;
    /** Default numbering config used when auto-creating the NR Object */
    defaultConfig?: {
        name: string;
        name_en?: string;
        number_length?: number;
        prefix?: string;
    };
}

// ══════════════════════════════════════════════════════════════
//  Component
// ══════════════════════════════════════════════════════════════

export function NumberRangeManager({
    objectType,
    title,
    allowObjectCreation = true,
    defaultConfig,
}: NumberRangeManagerProps) {
    // ── State ─────────────────────────────────────────────────
    const [objectData, setObjectData] = useState<NrObjectFull | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("groups");

    // Object setup dialog
    const [setupDialog, setSetupDialog] = useState(false);
    const [setupName, setSetupName] = useState(defaultConfig?.name || "");
    const [setupNameEn, setSetupNameEn] = useState(defaultConfig?.name_en || "");
    const [setupLength, setSetupLength] = useState(String(defaultConfig?.number_length || 8));
    const [setupPrefix, setSetupPrefix] = useState(defaultConfig?.prefix || "");

    // Group dialog
    const [groupDialog, setGroupDialog] = useState(false);
    const [editGroupId, setEditGroupId] = useState<number | null>(null);
    const [groupCode, setGroupCode] = useState("");
    const [groupName, setGroupName] = useState("");
    const [groupNameEn, setGroupNameEn] = useState("");
    const [groupDesc, setGroupDesc] = useState("");

    // Interval dialog
    const [intervalDialog, setIntervalDialog] = useState(false);
    const [editIntervalId, setEditIntervalId] = useState<number | null>(null);
    const [intCode, setIntCode] = useState("");
    const [intDesc, setIntDesc] = useState("");
    const [intFrom, setIntFrom] = useState("");
    const [intTo, setIntTo] = useState("");
    const [intExternal, setIntExternal] = useState("false");

    // Assignment dialog
    const [assignDialog, setAssignDialog] = useState(false);
    const [assignGroupId, setAssignGroupId] = useState("");
    const [assignIntervalId, setAssignIntervalId] = useState("");

    // Expansion dialog
    const [expandDialog, setExpandDialog] = useState(false);
    const [expandIntervalId, setExpandIntervalId] = useState<number | null>(null);
    const [expandNewTo, setExpandNewTo] = useState("");
    const [expandReason, setExpandReason] = useState("");

    // Expansion logs
    const [logsDialog, setLogsDialog] = useState(false);
    const [logsIntervalId, setLogsIntervalId] = useState<number | null>(null);

    // Delete confirm
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

    // ── Load Data ─────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.OBJECTS.byType(objectType));
            if (res.success && res.id) {
                setObjectData(res as unknown as NrObjectFull);
            } else {
                setObjectData(null);
            }
        } catch {
            setObjectData(null);
        } finally {
            setIsLoading(false);
        }
    }, [objectType]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Object Setup ──────────────────────────────────────────
    const createObject = async () => {
        if (!setupName || !setupLength) {
            showAlert("nr-alert", "يرجى ملء الحقول المطلوبة", "error");
            return;
        }
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.OBJECTS.BASE, {
                method: "POST",
                body: JSON.stringify({
                    object_type: objectType,
                    name: setupName,
                    name_en: setupNameEn || null,
                    number_length: parseInt(setupLength),
                    prefix: setupPrefix || null,
                }),
            });
            if (res.success) {
                showAlert("nr-alert", "تم إنشاء إعدادات الترقيم بنجاح", "success");
                setSetupDialog(false);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل الإنشاء", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Group CRUD ─────────────────────────────────────────────
    const openAddGroup = () => {
        setEditGroupId(null);
        setGroupCode("");
        setGroupName("");
        setGroupNameEn("");
        setGroupDesc("");
        setGroupDialog(true);
    };

    const openEditGroup = (g: NrGroup) => {
        setEditGroupId(g.id);
        setGroupCode(g.code);
        setGroupName(g.name);
        setGroupNameEn(g.name_en || "");
        setGroupDesc(g.description || "");
        setGroupDialog(true);
    };

    const saveGroup = async () => {
        if (!groupCode || !groupName || !objectData) {
            showAlert("nr-alert", "يرجى ملء الكود والاسم", "error");
            return;
        }
        try {
            const isEdit = editGroupId !== null;
            const url = isEdit
                ? API_ENDPOINTS.NUMBER_RANGES.GROUPS.update(editGroupId!)
                : API_ENDPOINTS.NUMBER_RANGES.GROUPS.create(objectData.id);
            const method = isEdit ? "PUT" : "POST";

            const res = await fetchAPI(url, {
                method,
                body: JSON.stringify({
                    code: groupCode,
                    name: groupName,
                    name_en: groupNameEn || null,
                    description: groupDesc || null,
                }),
            });
            if (res.success) {
                showAlert("nr-alert", isEdit ? "تم تحديث المجموعة" : "تم إنشاء المجموعة", "success");
                setGroupDialog(false);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل الحفظ", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Interval CRUD ─────────────────────────────────────────
    const openAddInterval = () => {
        setEditIntervalId(null);
        setIntCode("");
        setIntDesc("");
        setIntFrom("");
        setIntTo("");
        setIntExternal("false");
        setIntervalDialog(true);
    };

    const openEditInterval = (iv: NrInterval) => {
        setEditIntervalId(iv.id);
        setIntCode(iv.code);
        setIntDesc(iv.description || "");
        setIntFrom(String(iv.from_number));
        setIntTo(String(iv.to_number));
        setIntExternal(iv.is_external ? "true" : "false");
        setIntervalDialog(true);
    };

    const saveInterval = async () => {
        if (!intCode || !intFrom || !intTo || !objectData) {
            showAlert("nr-alert", "يرجى ملء الحقول المطلوبة", "error");
            return;
        }
        try {
            const isEdit = editIntervalId !== null;
            const url = isEdit
                ? API_ENDPOINTS.NUMBER_RANGES.INTERVALS.update(editIntervalId!)
                : API_ENDPOINTS.NUMBER_RANGES.INTERVALS.create(objectData.id);
            const method = isEdit ? "PUT" : "POST";

            const body: Record<string, unknown> = {
                code: intCode,
                description: intDesc || null,
                is_external: intExternal === "true",
            };
            if (!isEdit) {
                body.from_number = parseInt(intFrom);
                body.to_number = parseInt(intTo);
            }

            const res = await fetchAPI(url, { method, body: JSON.stringify(body) });
            if (res.success) {
                showAlert("nr-alert", isEdit ? "تم تحديث النطاق" : "تم إنشاء النطاق", "success");
                setIntervalDialog(false);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل الحفظ", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Assignment CRUD ───────────────────────────────────────
    const openAssignment = () => {
        setAssignGroupId("");
        setAssignIntervalId("");
        setAssignDialog(true);
    };

    const saveAssignment = async () => {
        if (!assignGroupId || !assignIntervalId || !objectData) {
            showAlert("nr-alert", "يرجى اختيار مجموعة ونطاق", "error");
            return;
        }
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.ASSIGNMENTS.create(objectData.id), {
                method: "POST",
                body: JSON.stringify({
                    nr_group_id: parseInt(assignGroupId),
                    nr_interval_id: parseInt(assignIntervalId),
                }),
            });
            if (res.success) {
                showAlert("nr-alert", "تم الربط بنجاح", "success");
                setAssignDialog(false);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل الربط", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Expand Interval ───────────────────────────────────────
    const openExpand = (iv: NrInterval) => {
        setExpandIntervalId(iv.id);
        setExpandNewTo("");
        setExpandReason("");
        setExpandDialog(true);
    };

    const saveExpansion = async () => {
        if (!expandNewTo || !expandIntervalId) {
            showAlert("nr-alert", "يرجى إدخال الحد الجديد", "error");
            return;
        }
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.INTERVALS.expand(expandIntervalId), {
                method: "POST",
                body: JSON.stringify({
                    new_to: parseInt(expandNewTo),
                    reason: expandReason || null,
                }),
            });
            if (res.success) {
                showAlert("nr-alert", "تم توسيع النطاق بنجاح", "success");
                setExpandDialog(false);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل التوسيع", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Delete Handler ────────────────────────────────────────
    const triggerDelete = (type: string, id: number) => {
        setDeleteTarget({ type, id });
        setConfirmDelete(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        try {
            let url = "";
            if (deleteTarget.type === "group") url = API_ENDPOINTS.NUMBER_RANGES.GROUPS.delete(deleteTarget.id);
            else if (deleteTarget.type === "interval") url = API_ENDPOINTS.NUMBER_RANGES.INTERVALS.delete(deleteTarget.id);
            else if (deleteTarget.type === "assignment") url = API_ENDPOINTS.NUMBER_RANGES.ASSIGNMENTS.delete(deleteTarget.id);

            const res = await fetchAPI(url, { method: "DELETE" });
            if (res.success) {
                showAlert("nr-alert", "تم الحذف بنجاح", "success");
                setConfirmDelete(false);
                setDeleteTarget(null);
                await loadData();
            } else {
                showAlert("nr-alert", res.message || "فشل الحذف", "error");
            }
        } catch {
            showAlert("nr-alert", "خطأ في الاتصال", "error");
        }
    };

    // ── Expansion Logs ────────────────────────────────────────
    const openLogs = (intervalId: number) => {
        setLogsIntervalId(intervalId);
        setLogsDialog(true);
    };

    // ── Tab Definitions ───────────────────────────────────────
    const tabs: Tab[] = [
        { key: "groups", label: "المجموعات", icon: "layers" },
        { key: "intervals", label: "نطاقات الأرقام", icon: "hash" },
        { key: "assignments", label: "الربط والتعيين", icon: "link" },
        { key: "fullness", label: "تحليل الامتلاء", icon: "pie-chart" },
    ];

    // ── Table Columns ─────────────────────────────────────────

    const groupColumns: Column<NrGroup>[] = [
        {
            key: "code", header: "الكود", dataLabel: "الكود",
            render: (item) => (
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary)" }}>
                    {item.code}
                </span>
            ),
        },
        {
            key: "name", header: "الاسم", dataLabel: "الاسم", render: (item) => (
                <div>
                    <strong>{item.name}</strong>
                    {item.name_en && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.name_en}</div>}
                </div>
            )
        },
        { key: "description", header: "الوصف", dataLabel: "الوصف", render: (item) => item.description || "—" },
        {
            key: "is_active", header: "الحالة", dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${item.is_active ? "badge-success" : "badge-danger"}`}>
                    {item.is_active ? "نشط" : "معطل"}
                </span>
            ),
        },
        {
            key: "actions", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons actions={[
                    { icon: "edit", title: "تعديل", variant: "edit", onClick: () => openEditGroup(item) },
                    { icon: "trash", title: "حذف", variant: "delete", onClick: () => triggerDelete("group", item.id) },
                ]} />
            ),
        },
    ];

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
                    { icon: "edit", title: "تعديل", variant: "edit", onClick: () => openEditInterval(item) },
                    { icon: "trash", title: "حذف", variant: "delete", onClick: () => triggerDelete("interval", item.id), hidden: item.current_number > 0 },
                ]} />
            ),
        },
    ];

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
                    { icon: "trash", title: "إلغاء الربط", variant: "delete", onClick: () => triggerDelete("assignment", item.id) },
                ]} />
            ),
        },
    ];

    // ── Loading State ─────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="nr-manager-loading">
                <div className="nr-spinner" />
                <p>جارِ تحميل إعدادات الترقيم...</p>
            </div>
        );
    }

    // ── No Object — Setup Prompt ──────────────────────────────
    if (!objectData && allowObjectCreation) {
        return (
            <div className="nr-manager-container">
                <div id="nr-alert" />
                <div className="nr-setup-prompt">
                    <div className="nr-setup-icon">{getIcon("hash")}</div>
                    <h3>إعداد نظام الترقيم</h3>
                    <p>لم يتم تكوين نظام ترقيم لهذا النوع بعد. قم بتحديد طول الترقيم والإعدادات الأولية للبدء.</p>
                    <Button variant="primary" onClick={() => setSetupDialog(true)} icon="plus">
                        إعداد نظام الترقيم
                    </Button>
                </div>

                <Dialog
                    isOpen={setupDialog}
                    onClose={() => setSetupDialog(false)}
                    title="إعداد نظام الترقيم"
                    maxWidth="520px"
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setSetupDialog(false)}>إلغاء</Button>
                            <Button variant="primary" onClick={createObject}>إنشاء</Button>
                        </>
                    }
                >
                    <form onSubmit={(e) => { e.preventDefault(); createObject(); }}>
                        <div className="nr-info-banner">
                            <span className="nr-info-icon">{getIcon("info")}</span>
                            <span>طول الترقيم يحدد الحد الأقصى لنطاقات الأرقام المتاحة. مثال: طول 8 أرقام يسمح بنطاقات حتى 99,999,999</span>
                        </div>
                        <div className="form-row">
                            <TextInput label="الاسم بالعربية *" id="nr-setup-name" value={setupName} onChange={(e) => setSetupName(e.target.value)} required className="flex-1" />
                            <TextInput label="الاسم بالإنجليزية" id="nr-setup-name-en" value={setupNameEn} onChange={(e) => setSetupNameEn(e.target.value)} className="flex-1" />
                        </div>
                        <div className="form-row">
                            <NumberInput label="طول الترقيم *" id="nr-setup-length" value={setupLength} onChange={setSetupLength} min={1} max={20} className="flex-1" />
                            <TextInput label="البادئة (اختياري)" id="nr-setup-prefix" value={setupPrefix} onChange={(e) => setSetupPrefix(e.target.value)} className="flex-1" placeholder="EMP-" />
                        </div>
                    </form>
                </Dialog>
            </div>
        );
    }

    if (!objectData) return null;

    // ── Main Render ───────────────────────────────────────────
    return (
        <div className="nr-manager-container">
            <div id="nr-alert" />

            {/* ── Header ──────────────────────────────────────── */}
            <div className="nr-manager-header">
                <div className="nr-header-info">
                    <div className="nr-header-icon">{getIcon("hash")}</div>
                    <div>
                        <h2 className="nr-title">{title || objectData.name}</h2>
                        <div className="nr-subtitle">
                            {objectData.name_en && <span>{objectData.name_en}</span>}
                            <span className="nr-meta-badge">
                                {getIcon("ruler")} طول الترقيم: {objectData.number_length} أرقام
                            </span>
                            {objectData.prefix && (
                                <span className="nr-meta-badge">
                                    {getIcon("tag")} البادئة: {objectData.prefix}
                                </span>
                            )}
                            <span className="nr-meta-badge">
                                الحد الأقصى: {Number("9".repeat(objectData.number_length)).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Summary KPIs */}
                <div className="nr-kpi-strip">
                    <div className="nr-kpi">
                        <div className="nr-kpi-value" style={{ color: "#3b82f6" }}>{objectData.summary.total_groups}</div>
                        <div className="nr-kpi-label">مجموعة</div>
                    </div>
                    <div className="nr-kpi">
                        <div className="nr-kpi-value" style={{ color: "#8b5cf6" }}>{objectData.summary.total_intervals}</div>
                        <div className="nr-kpi-label">نطاق</div>
                    </div>
                    <div className="nr-kpi">
                        <div className="nr-kpi-value" style={{ color: "#10b981" }}>{objectData.summary.total_assignments}</div>
                        <div className="nr-kpi-label">ربط</div>
                    </div>
                    <div className="nr-kpi">
                        <div className="nr-kpi-value" style={{
                            color: objectData.summary.overall_fullness >= 95 ? "#ef4444"
                                : objectData.summary.overall_fullness >= 80 ? "#f59e0b"
                                    : "#10b981"
                        }}>
                            {objectData.summary.overall_fullness}%
                        </div>
                        <div className="nr-kpi-label">امتلاء</div>
                    </div>
                    <div className="nr-kpi">
                        <div className="nr-kpi-value" style={{ color: "var(--text-secondary)" }}>{objectData.summary.total_remaining.toLocaleString()}</div>
                        <div className="nr-kpi-label">متبقي</div>
                    </div>
                </div>
            </div>

            {/* ── Tab Navigation ──────────────────────────────── */}
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ── Tab Content ─────────────────────────────────── */}
            <div className="nr-tab-content">

                {/* Groups Tab */}
                {activeTab === "groups" && (
                    <div>
                        <div className="nr-section-header">
                            <h3>المجموعات</h3>
                            <Button variant="primary" onClick={openAddGroup} icon="plus">مجموعة جديدة</Button>
                        </div>
                        <Table
                            columns={groupColumns}
                            data={objectData.groups || []}
                            keyExtractor={(item) => item.id}
                            emptyMessage="لا توجد مجموعات — أضف مجموعة للبدء"
                        />
                    </div>
                )}

                {/* Intervals Tab */}
                {activeTab === "intervals" && (
                    <div>
                        <div className="nr-section-header">
                            <h3>نطاقات الأرقام</h3>
                            <Button variant="primary" onClick={openAddInterval} icon="plus">نطاق جديد</Button>
                        </div>
                        <Table
                            columns={intervalColumns}
                            data={objectData.intervals || []}
                            keyExtractor={(item) => item.id}
                            emptyMessage="لا توجد نطاقات أرقام — أضف نطاقاً للبدء"
                        />
                    </div>
                )}

                {/* Assignments Tab */}
                {activeTab === "assignments" && (
                    <div>
                        <div className="nr-section-header">
                            <h3>الربط والتعيين</h3>
                            <Button variant="primary" onClick={openAssignment} icon="link">ربط جديد</Button>
                        </div>
                        <Table
                            columns={assignmentColumns}
                            data={objectData.assignments || []}
                            keyExtractor={(item) => item.id}
                            emptyMessage="لا توجد روابط — أنشئ مجموعات ونطاقات أولاً ثم اربطها"
                        />
                    </div>
                )}

                {/* Fullness Tab */}
                {activeTab === "fullness" && (
                    <DomainFullnessPanel
                        intervals={objectData.intervals || []}
                        numberLength={objectData.number_length}
                        onExpand={openExpand}
                        onViewLogs={openLogs}
                    />
                )}
            </div>

            {/* ══════════════════ Dialogs ═══════════════════════ */}

            {/* Group Dialog */}
            <Dialog
                isOpen={groupDialog}
                onClose={() => setGroupDialog(false)}
                title={editGroupId ? "تعديل المجموعة" : "إضافة مجموعة جديدة"}
                maxWidth="520px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setGroupDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={saveGroup}>حفظ</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); saveGroup(); }}>
                    <div className="form-row">
                        <TextInput label="الكود *" id="grp-code" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} required className="flex-1" placeholder="GRP-01" />
                    </div>
                    <div className="form-row">
                        <TextInput label="الاسم بالعربية *" id="grp-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} required className="flex-1" />
                        <TextInput label="الاسم بالإنجليزية" id="grp-name-en" value={groupNameEn} onChange={(e) => setGroupNameEn(e.target.value)} className="flex-1" />
                    </div>
                    <Textarea label="الوصف" id="grp-desc" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} rows={2} />
                </form>
            </Dialog>

            {/* Interval Dialog */}
            <Dialog
                isOpen={intervalDialog}
                onClose={() => setIntervalDialog(false)}
                title={editIntervalId ? "تعديل نطاق الأرقام" : "إضافة نطاق أرقام جديد"}
                maxWidth="560px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIntervalDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={saveInterval}>حفظ</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); saveInterval(); }}>
                    <div className="nr-info-banner">
                        <span className="nr-info-icon">{getIcon("info")}</span>
                        <span>النطاق يجب أن يكون ضمن الحدود المسموحة (1 إلى {Number("9".repeat(objectData.number_length)).toLocaleString()}) ولا يتداخل مع نطاقات أخرى</span>
                    </div>
                    <div className="form-row">
                        <TextInput label="الكود *" id="int-code" value={intCode} onChange={(e) => setIntCode(e.target.value)} required className="flex-1" placeholder="INT-01" />
                        <Select
                            label="النوع"
                            id="int-type"
                            value={intExternal}
                            onChange={(e) => setIntExternal(e.target.value)}
                            className="flex-1"
                            options={[
                                { value: "false", label: "داخلي (تلقائي)" },
                                { value: "true", label: "خارجي (يدوي)" },
                            ]}
                        />
                    </div>
                    {!editIntervalId && (
                        <div className="form-row">
                            <NumberInput label="من الرقم *" id="int-from" value={intFrom} onChange={setIntFrom} min={1} className="flex-1" />
                            <NumberInput label="إلى الرقم *" id="int-to" value={intTo} onChange={setIntTo} min={1} className="flex-1" />
                        </div>
                    )}
                    {editIntervalId && (
                        <div className="nr-info-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                            <span className="nr-info-icon" style={{ color: "#f59e0b" }}>{getIcon("alert-triangle")}</span>
                            <span>لتغيير حدود النطاق، استخدم وظيفة التوسيع من الجدول</span>
                        </div>
                    )}
                    <Textarea label="الوصف" id="int-desc" value={intDesc} onChange={(e) => setIntDesc(e.target.value)} rows={2} />
                </form>
            </Dialog>

            {/* Assignment Dialog */}
            <Dialog
                isOpen={assignDialog}
                onClose={() => setAssignDialog(false)}
                title="ربط مجموعة بنطاق أرقام"
                maxWidth="480px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAssignDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={saveAssignment}>ربط</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); saveAssignment(); }}>
                    <Select
                        label="المجموعة *"
                        id="assign-group"
                        value={assignGroupId}
                        onChange={(e) => setAssignGroupId(e.target.value)}
                        options={[
                            { value: "", label: "— اختر مجموعة —" },
                            ...(objectData.groups || []).map(g => ({ value: String(g.id), label: `${g.code} — ${g.name}` })),
                        ]}
                    />
                    <Select
                        label="النطاق *"
                        id="assign-interval"
                        value={assignIntervalId}
                        onChange={(e) => setAssignIntervalId(e.target.value)}
                        options={[
                            { value: "", label: "— اختر نطاقاً —" },
                            ...(objectData.intervals || []).map(iv => ({
                                value: String(iv.id),
                                label: `${iv.code} (${iv.from_number.toLocaleString()} → ${iv.to_number.toLocaleString()})`,
                            })),
                        ]}
                    />
                </form>
            </Dialog>

            {/* Expand Dialog */}
            <Dialog
                isOpen={expandDialog}
                onClose={() => setExpandDialog(false)}
                title="توسيع نطاق الأرقام"
                maxWidth="480px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setExpandDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={saveExpansion}>توسيع</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); saveExpansion(); }}>
                    <div className="nr-info-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                        <span className="nr-info-icon" style={{ color: "#f59e0b" }}>{getIcon("alert-triangle")}</span>
                        <span>عملية التوسيع لا يمكن التراجع عنها وسيتم تسجيلها في سجل التوسعات</span>
                    </div>
                    <NumberInput label="الحد الأعلى الجديد *" id="expand-new-to" value={expandNewTo} onChange={setExpandNewTo} min={1} />
                    <Textarea label="سبب التوسيع" id="expand-reason" value={expandReason} onChange={(e) => setExpandReason(e.target.value)} rows={2} placeholder="أدخل سبب التوسيع للتوثيق..." />
                </form>
            </Dialog>

            {/* Expansion Logs */}
            {logsDialog && logsIntervalId && (
                <ExpansionLogsPanel
                    intervalId={logsIntervalId}
                    isOpen={logsDialog}
                    onClose={() => setLogsDialog(false)}
                />
            )}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => { setConfirmDelete(false); setDeleteTarget(null); }}
                onConfirm={executeDelete}
                title="تأكيد الحذف"
                message={
                    deleteTarget?.type === "group" ? "هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع الروابط المرتبطة بها."
                        : deleteTarget?.type === "interval" ? "هل أنت متأكد من حذف هذا النطاق؟"
                            : "هل أنت متأكد من إلغاء هذا الربط؟"
                }
                confirmText="حذف"
                confirmVariant="danger"
            />
        </div>
    );
}
