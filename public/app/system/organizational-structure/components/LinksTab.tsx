"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, Dialog, ConfirmDialog, showToast, Column, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/TextInput";
import { getIcon } from "@/lib/icons";

interface MetaType { id: string; display_name: string; display_name_ar?: string; level_domain: string; }
interface StructureNode { node_uuid: string; node_type_id: string; code: string; attributes_json?: Record<string, unknown>; status: string; meta_type?: MetaType; }
interface StructureLink {
    id: number; source_node_uuid: string; target_node_uuid: string; link_type: string;
    topology_rule_id: number; priority: number; valid_from?: string; valid_to?: string;
    source_node?: StructureNode; target_node?: StructureNode;
    topology_rule?: { cardinality: string; description?: string };
}
interface TopologyRule { id: number; source_node_type_id: string; target_node_type_id: string; cardinality: string; description?: string; }

const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6", Financial: "#3b82f6", Controlling: "#06b6d4",
    Logistics: "#10b981", Sales: "#f59e0b", HR: "#ec4899", Project: "#6366f1",
};

export function LinksTab() {
    const [nodes, setNodes] = useState<StructureNode[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [topologyRules, setTopologyRules] = useState<TopologyRule[]>([]);
    const [links, setLinks] = useState<StructureLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addDialog, setAddDialog] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [selectedLink, setSelectedLink] = useState<StructureLink | null>(null);
    const [sourceUuid, setSourceUuid] = useState("");
    const [targetUuid, setTargetUuid] = useState("");
    const [linkType, setLinkType] = useState("assignment");
    const [priority, setPriority] = useState("0");
    const [validFrom, setValidFrom] = useState("");
    const [validTo, setValidTo] = useState("");
    const [filterSourceType, setFilterSourceType] = useState("");
    const [filterTargetType, setFilterTargetType] = useState("");
    const [filterLinkType, setFilterLinkType] = useState("");
    const [showActiveOnly, setShowActiveOnly] = useState(false);

    const loadAll = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            if (filterSourceType) params.set("source_type", filterSourceType);
            if (filterTargetType) params.set("target_type", filterTargetType);
            if (filterLinkType) params.set("link_type", filterLinkType);
            if (showActiveOnly) params.set("active_only", "1");

            const [linksRes, nodesRes, metaRes, rulesRes] = await Promise.all([
                fetchAPI(`${API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.LINKS}?${params}`),
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODES),
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.META_TYPES),
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.TOPOLOGY_RULES),
            ]);
            setLinks((linksRes.links as StructureLink[]) || []);
            setNodes((nodesRes.nodes as StructureNode[]) || []);
            setMetaTypes((metaRes.meta_types as MetaType[]) || []);
            setTopologyRules((rulesRes.topology_rules as TopologyRule[]) || []);
        } catch { showToast("خطأ في تحميل البيانات", "error"); }
        finally { setIsLoading(false); }
    }, [filterSourceType, filterTargetType, filterLinkType, showActiveOnly]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const getTypeLabel = (id: string) => metaTypes.find((t) => t.id === id)?.display_name_ar || metaTypes.find((t) => t.id === id)?.display_name || id;
    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";
    const getNodeLabel = (node?: StructureNode) => {
        if (!node) return "—";
        const name = (node.attributes_json?.name as string) || "";
        const domain = getTypeDomain(node.node_type_id);
        const color = DOMAIN_COLORS[domain] || "#6b7280";
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ padding: "1px 6px", borderRadius: "4px", background: color + "18", color, fontSize: "0.7rem", fontWeight: 600 }}>
                    {getTypeLabel(node.node_type_id)}
                </span>
                <strong style={{ fontSize: "0.85rem" }}>{node.code}</strong>
                {name && <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>({name})</span>}
            </div>
        );
    };

    const isLinkActive = (link: StructureLink) => {
        if (!link.valid_to) return true;
        return new Date(link.valid_to) >= new Date();
    };

    const handleCreateLink = async () => {
        if (!sourceUuid || !targetUuid) { showToast("يرجى اختيار المصدر والهدف", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.LINKS, {
                method: "POST",
                body: JSON.stringify({
                    source_node_uuid: sourceUuid, target_node_uuid: targetUuid,
                    link_type: linkType, priority: parseInt(priority) || 0,
                    valid_from: validFrom || null, valid_to: validTo || null,
                }),
            });
            showToast("تم إنشاء الارتباط", "success");
            resetForm(); setAddDialog(false); loadAll();
        } catch (e: unknown) {
            showToast((e as { message?: string })?.message || "خطأ في الإنشاء", "error");
        }
    };

    const openEditDialog = (link: StructureLink) => {
        setSelectedLink(link);
        setLinkType(link.link_type || "assignment");
        setPriority(String(link.priority || 0));
        setValidFrom(link.valid_from?.substring(0, 10) || "");
        setValidTo(link.valid_to?.substring(0, 10) || "");
        setEditDialog(true);
    };

    const handleUpdateLink = async () => {
        if (!selectedLink) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.LINK(selectedLink.id), {
                method: "PUT",
                body: JSON.stringify({
                    link_type: linkType, priority: parseInt(priority) || 0,
                    valid_from: validFrom || null, valid_to: validTo || null,
                }),
            });
            showToast("تم تحديث الارتباط", "success");
            setEditDialog(false); setSelectedLink(null); loadAll();
        } catch (e: unknown) {
            showToast((e as { message?: string })?.message || "خطأ في التحديث", "error");
        }
    };

    const confirmDeleteLink = (link: StructureLink) => {
        setSelectedLink(link);
        setDeleteDialog(true);
    };

    const handleDeleteLink = async () => {
        if (!selectedLink) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.LINK(selectedLink.id), { method: "DELETE" });
            showToast("تم حذف الارتباط", "success");
            setDeleteDialog(false); setSelectedLink(null); loadAll();
        } catch (e: unknown) {
            showToast((e as { message?: string })?.message || "خطأ في الحذف", "error");
        }
    };

    const resetForm = () => {
        setSourceUuid(""); setTargetUuid(""); setLinkType("assignment");
        setPriority("0"); setValidFrom(""); setValidTo("");
    };

    // Get valid targets based on topology rules
    const getValidTargets = () => {
        if (!sourceUuid) return [];
        const sourceNode = nodes.find((n) => n.node_uuid === sourceUuid);
        if (!sourceNode) return [];
        const validTargetTypes = topologyRules
            .filter((r) => r.source_node_type_id === sourceNode.node_type_id)
            .map((r) => r.target_node_type_id);
        return nodes.filter((n) => validTargetTypes.includes(n.node_type_id) && n.node_uuid !== sourceUuid);
    };

    const uniqueTypes = [...new Set(metaTypes.map(t => t.id))];

    const linkColumns: Column<StructureLink>[] = [
        { key: "id", header: "#", dataLabel: "#", render: (l) => <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{l.id}</span> },
        { key: "source", header: "المصدر (Source)", dataLabel: "المصدر", render: (l) => getNodeLabel(l.source_node) },
        {
            key: "arrow", header: "", dataLabel: "",
            render: (l) => {
                const card = l.topology_rule?.cardinality || "—";
                return (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ color: "var(--primary)", fontSize: "1rem" }}>→</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{card}</div>
                    </div>
                );
            },
        },
        { key: "target", header: "الهدف (Target)", dataLabel: "الهدف", render: (l) => getNodeLabel(l.target_node) },
        {
            key: "link_type", header: "النوع", dataLabel: "النوع",
            render: (l) => <span className="badge badge-primary" style={{ fontSize: "0.72rem" }}>{l.link_type || "assignment"}</span>,
        },
        {
            key: "priority", header: "الأولوية", dataLabel: "الأولوية",
            render: (l) => <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{l.priority ?? 0}</span>,
        },
        {
            key: "validity", header: "الصلاحية", dataLabel: "الصلاحية",
            render: (l) => {
                const active = isLinkActive(l);
                if (!l.valid_from && !l.valid_to) return <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>دائمة</span>;
                return (
                    <div style={{ fontSize: "0.72rem" }}>
                        <span style={{ color: active ? "var(--text-secondary)" : "var(--danger)" }}>
                            {l.valid_from?.substring(0, 10) || "∞"} → {l.valid_to?.substring(0, 10) || "∞"}
                        </span>
                        {!active && <span className="badge badge-danger" style={{ fontSize: "0.6rem", marginRight: "4px" }}>منتهي</span>}
                    </div>
                );
            },
        },
        {
            key: "actions", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (l) => (
                <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button onClick={() => openEditDialog(l)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "1rem" }} title="تعديل">
                        {getIcon("edit")}
                    </button>
                    <button onClick={() => confirmDeleteLink(l)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "1rem" }} title="حذف">
                        {getIcon("trash")}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="sales-card animate-fade">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{getIcon("link")} إدارة الارتباطات (Assignment Matrix)</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "4px 0 0" }}>
                            ارتباطات الهيكل التنظيمي بما يحاكي SAP Assignment Block — تحكّم بالعلاقات والصلاحية الزمنية.
                        </p>
                    </div>
                    <Button variant="primary" icon="plus" onClick={() => { resetForm(); setAddDialog(true); }}>إنشاء ارتباط</Button>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <Select value={filterSourceType} onChange={(e) => setFilterSourceType(e.target.value)} style={{ maxWidth: "160px" }}>
                        <option value="">نوع المصدر (الكل)</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                    </Select>
                    <Select value={filterTargetType} onChange={(e) => setFilterTargetType(e.target.value)} style={{ maxWidth: "160px" }}>
                        <option value="">نوع الهدف (الكل)</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                    </Select>
                    <Select value={filterLinkType} onChange={(e) => setFilterLinkType(e.target.value)} style={{ maxWidth: "130px" }}>
                        <option value="">نوع الارتباط (الكل)</option>
                        <option value="assignment">تعيين</option>
                        <option value="reporting">تقارير</option>
                    </Select>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                        <input type="checkbox" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} />
                        نشطة فقط
                    </label>
                </div>

                {/* Summary stats */}
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>إجمالي: <strong>{links.length}</strong></span>
                    <span style={{ color: "#10b981" }}>نشط: <strong>{links.filter(l => isLinkActive(l)).length}</strong></span>
                    <span style={{ color: "#ef4444" }}>منتهي: <strong>{links.filter(l => !isLinkActive(l)).length}</strong></span>
                </div>

                <Table columns={linkColumns} data={links} keyExtractor={(l) => String(l.id)} emptyMessage="لا توجد ارتباطات" isLoading={isLoading} />
            </div>

            {/* Create Link Dialog */}
            <Dialog isOpen={addDialog} onClose={() => setAddDialog(false)} title="إنشاء ارتباط جديد"
                footer={<><Button variant="secondary" onClick={() => setAddDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleCreateLink}>إنشاء</Button></>}>
                <div className="form-group">
                    <Select label="الوحدة المصدر *" value={sourceUuid} onChange={(e) => { setSourceUuid(e.target.value); setTargetUuid(""); }}>
                        <option value="">اختر الوحدة المصدر</option>
                        {nodes.map((n) => <option key={n.node_uuid} value={n.node_uuid}>{n.code} — {getTypeLabel(n.node_type_id)}{(n.attributes_json?.name as string) ? ` (${n.attributes_json?.name})` : ""}</option>)}
                    </Select>
                </div>
                <div className="form-group">
                    <Select label="الوحدة الهدف *" value={targetUuid} onChange={(e) => setTargetUuid(e.target.value)} disabled={!sourceUuid}>
                        <option value="">اختر الوحدة الهدف</option>
                        {getValidTargets().map((n) => <option key={n.node_uuid} value={n.node_uuid}>{n.code} — {getTypeLabel(n.node_type_id)}{(n.attributes_json?.name as string) ? ` (${n.attributes_json?.name})` : ""}</option>)}
                    </Select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <Select label="نوع الارتباط" value={linkType} onChange={(e) => setLinkType(e.target.value)}>
                            <option value="assignment">تعيين (Assignment)</option>
                            <option value="reporting">تقارير (Reporting)</option>
                        </Select>
                    </div>
                    <div className="form-group">
                        <TextInput label="الأولوية" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
                    </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.5rem 0 0.25rem" }}>
                    {getIcon("calendar")} فترة الصلاحية (اختياري)
                </p>
                <div className="form-row">
                    <div className="form-group">
                        <TextInput label="من" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <TextInput label="حتى" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                    </div>
                </div>
                {sourceUuid && (
                    <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.75rem" }}>
                        <strong>العلاقات المسموحة (Topology Rules):</strong>
                        {topologyRules
                            .filter((r) => r.source_node_type_id === nodes.find((n) => n.node_uuid === sourceUuid)?.node_type_id)
                            .map((r) => (
                                <div key={r.id} style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                                    → {getTypeLabel(r.target_node_type_id)} ({r.cardinality}) — {r.description || ""}
                                </div>
                            ))}
                    </div>
                )}
            </Dialog>

            {/* Edit Link Dialog */}
            <Dialog isOpen={editDialog} onClose={() => setEditDialog(false)} title="تعديل الارتباط"
                footer={<><Button variant="secondary" onClick={() => setEditDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleUpdateLink}>تحديث</Button></>}>
                {selectedLink && (
                    <>
                        <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                <strong>{selectedLink.source_node?.code}</strong>
                                <span style={{ color: "var(--primary)" }}>→</span>
                                <strong>{selectedLink.target_node?.code}</strong>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                    ({selectedLink.topology_rule?.cardinality || "—"})
                                </span>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <Select label="نوع الارتباط" value={linkType} onChange={(e) => setLinkType(e.target.value)}>
                                    <option value="assignment">تعيين (Assignment)</option>
                                    <option value="reporting">تقارير (Reporting)</option>
                                </Select>
                            </div>
                            <div className="form-group">
                                <TextInput label="الأولوية" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
                            </div>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.5rem 0 0.25rem" }}>
                            {getIcon("calendar")} فترة الصلاحية
                        </p>
                        <div className="form-row">
                            <div className="form-group">
                                <TextInput label="من" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <TextInput label="حتى" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                            </div>
                        </div>
                    </>
                )}
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDeleteLink}
                title="تأكيد حذف الارتباط"
                message={`هل أنت متأكد من حذف الارتباط بين "${selectedLink?.source_node?.code || "?"}" و "${selectedLink?.target_node?.code || "?"}"؟`}
                confirmText="حذف" confirmVariant="danger" />
        </>
    );
}
