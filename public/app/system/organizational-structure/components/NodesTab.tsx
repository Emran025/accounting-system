"use client";

import { useState, useEffect, useCallback } from "react";
import { ActionButtons, Table, Dialog, ConfirmDialog, showToast, Column, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { getIcon } from "@/lib/icons";

interface MetaType {
    id: string;
    display_name: string;
    display_name_ar?: string;
    level_domain: string;
    attributes?: { attribute_key: string; is_mandatory: boolean; attribute_type: string }[];
}

interface StructureNode {
    node_uuid: string;
    node_type_id: string;
    code: string;
    attributes_json?: Record<string, unknown>;
    status: string;
    valid_from?: string;
    valid_to?: string;
    meta_type?: MetaType;
    outgoing_links?: { id: number }[];
    incoming_links?: { id: number }[];
}

interface TopologyRule {
    id: number;
    source_node_type_id: string;
    target_node_type_id: string;
    cardinality: string;
}

const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6", Financial: "#3b82f6", Controlling: "#06b6d4",
    Logistics: "#10b981", Sales: "#f59e0b", HR: "#ec4899", Project: "#6366f1",
};

export function NodesTab() {
    const [nodes, setNodes] = useState<StructureNode[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [topologyRules, setTopologyRules] = useState<TopologyRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDomain, setFilterDomain] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [formDialog, setFormDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [selectedNode, setSelectedNode] = useState<StructureNode | null>(null);
    const [deleteUuid, setDeleteUuid] = useState<string | null>(null);
    const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, string>>({});
    const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
    const [bulkDialog, setBulkDialog] = useState(false);
    const [bulkStatus, setBulkStatus] = useState("active");
    const [formData, setFormData] = useState({
        node_type_id: "", code: "", status: "active",
        target_node_uuid: "", validate_constraints: true,
        valid_from: "", valid_to: "",
    });

    const loadNodes = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.set("search", searchTerm);
            if (filterType) params.set("node_type_id", filterType);
            if (filterStatus) params.set("status", filterStatus);
            if (filterDomain) params.set("level_domain", filterDomain);
            const response = await fetchAPI(`${API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODES}?${params}`);
            setNodes((response.nodes as StructureNode[]) || []);
        } catch { showToast("خطأ في تحميل الوحدات التنظيمية", "error"); }
        finally { setIsLoading(false); }
    }, [searchTerm, filterType, filterStatus, filterDomain]);

    const loadMetaTypes = useCallback(async () => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.META_TYPES);
            setMetaTypes((response.meta_types as MetaType[]) || []);
        } catch { showToast("خطأ في تحميل أنواع الوحدات", "error"); }
    }, []);

    const loadTopologyRules = useCallback(async () => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.TOPOLOGY_RULES);
            setTopologyRules((response.topology_rules as TopologyRule[]) || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadNodes(); loadMetaTypes(); loadTopologyRules(); }, [loadNodes, loadMetaTypes, loadTopologyRules]);

    const getTypeLabel = (id: string) => metaTypes.find((t) => t.id === id)?.display_name_ar || metaTypes.find((t) => t.id === id)?.display_name || id;
    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";
    const getCurrentAttributes = () => metaTypes.find((t) => t.id === formData.node_type_id)?.attributes || [];

    const filteredMetaTypes = filterDomain ? metaTypes.filter((t) => t.level_domain === filterDomain) : metaTypes;
    const domains = [...new Set(metaTypes.map((t) => t.level_domain))].sort();

    const openAddDialog = () => {
        setSelectedNode(null);
        const firstType = filteredMetaTypes[0]?.id || metaTypes[0]?.id || "";
        setFormData({ node_type_id: firstType, code: "", status: "active", target_node_uuid: "", validate_constraints: true, valid_from: "", valid_to: "" });
        setDynamicAttrs({});
        setFormDialog(true);
    };

    const openEditDialog = (node: StructureNode) => {
        setSelectedNode(node);
        const attrs = node.attributes_json || {};
        const attrMap: Record<string, string> = {};
        Object.entries(attrs).forEach(([k, v]) => { attrMap[k] = typeof v === "object" ? JSON.stringify(v) : String(v || ""); });
        setFormData({
            node_type_id: node.node_type_id, code: node.code, status: node.status,
            target_node_uuid: "", validate_constraints: true,
            valid_from: node.valid_from?.substring(0, 10) || "",
            valid_to: node.valid_to?.substring(0, 10) || "",
        });
        setDynamicAttrs(attrMap);
        setFormDialog(true);
    };

    const handleSubmit = async () => {
        if (!formData.node_type_id.trim() || !formData.code.trim()) {
            showToast("يرجى إدخال النوع والرمز", "error"); return;
        }
        const attrs: Record<string, string> = { ...dynamicAttrs };
        const payload: Record<string, unknown> = {
            node_type_id: formData.node_type_id, code: formData.code.trim(), attributes: attrs, status: formData.status,
            valid_from: formData.valid_from || null,
            valid_to: formData.valid_to || null,
        };
        if (formData.target_node_uuid && !selectedNode) {
            payload.link = { target_node_uuid: formData.target_node_uuid, validate_constraints: formData.validate_constraints };
        }
        try {
            if (selectedNode) {
                await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODE(selectedNode.node_uuid), {
                    method: "PUT", body: JSON.stringify({
                        code: formData.code, attributes: attrs, status: formData.status,
                        valid_from: formData.valid_from || null, valid_to: formData.valid_to || null,
                    }),
                });
                showToast("تم تحديث الوحدة بنجاح", "success");
            } else {
                await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODES, { method: "POST", body: JSON.stringify(payload) });
                showToast("تمت إضافة الوحدة بنجاح", "success");
            }
            setFormDialog(false); loadNodes();
        } catch (e: unknown) {
            const err = e as { message?: string };
            showToast(err?.message || "خطأ في الحفظ", "error");
        }
    };

    const confirmDelete = (uuid: string) => { setDeleteUuid(uuid); setConfirmDialog(true); };

    const handleDelete = async () => {
        if (!deleteUuid) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODE(deleteUuid), { method: "DELETE" });
            showToast("تم حذف الوحدة", "success"); loadNodes();
        } catch (e: unknown) {
            const err = e as { message?: string };
            showToast(err?.message || "خطأ في الحذف", "error");
        }
        setConfirmDialog(false); setDeleteUuid(null);
    };

    const toggleSelect = (uuid: string) => {
        setSelectedUuids(prev => {
            const next = new Set(prev);
            next.has(uuid) ? next.delete(uuid) : next.add(uuid);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUuids.size === nodes.length) {
            setSelectedUuids(new Set());
        } else {
            setSelectedUuids(new Set(nodes.map(n => n.node_uuid)));
        }
    };

    const handleBulkStatus = async () => {
        if (selectedUuids.size === 0) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.BULK_STATUS, {
                method: "POST",
                body: JSON.stringify({ node_uuids: Array.from(selectedUuids), status: bulkStatus }),
            });
            showToast(`تم تحديث ${selectedUuids.size} وحدة`, "success");
            setSelectedUuids(new Set());
            setBulkDialog(false);
            loadNodes();
        } catch (e: unknown) {
            showToast((e as { message?: string })?.message || "خطأ في التحديث الجماعي", "error");
        }
    };

    const nodeColumns: Column<StructureNode>[] = [
        {
            key: "select", header: "", dataLabel: "",
            render: (item) => (
                <input type="checkbox" checked={selectedUuids.has(item.node_uuid)}
                    onChange={() => toggleSelect(item.node_uuid)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }} />
            ),
        },
        { key: "code", header: "الرمز", dataLabel: "الرمز" },
        {
            key: "node_type_id", header: "النوع", dataLabel: "النوع",
            render: (item) => {
                const domain = getTypeDomain(item.node_type_id);
                const color = DOMAIN_COLORS[domain] || "#6b7280";
                return (<span style={{ padding: "2px 8px", borderRadius: "4px", background: color + "20", color, fontSize: "0.8rem", fontWeight: 600 }}>{getTypeLabel(item.node_type_id)}</span>);
            },
        },
        {
            key: "domain", header: "المجال", dataLabel: "المجال",
            render: (item) => {
                const domain = getTypeDomain(item.node_type_id);
                return <span style={{ color: DOMAIN_COLORS[domain] || "#6b7280", fontWeight: 500, fontSize: "0.8rem" }}>{domain}</span>;
            },
        },
        {
            key: "name", header: "الاسم", dataLabel: "الاسم",
            render: (item) => (item.attributes_json as Record<string, unknown>)?.name as string || "-",
        },
        {
            key: "links", header: "الروابط", dataLabel: "الروابط",
            render: (item) => {
                const out = item.outgoing_links?.length ?? 0;
                const inc = item.incoming_links?.length ?? 0;
                return (
                    <div style={{ display: "flex", gap: "4px", fontSize: "0.75rem" }}>
                        <span title="صادرة" style={{ color: "#3b82f6" }}>↑{out}</span>
                        <span title="واردة" style={{ color: "#10b981" }}>↓{inc}</span>
                    </div>
                );
            },
        },
        {
            key: "validity", header: "الصلاحية", dataLabel: "الصلاحية",
            render: (item) => {
                if (!item.valid_from && !item.valid_to) return <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>;
                return (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        {item.valid_from?.substring(0, 10) || "∞"} → {item.valid_to?.substring(0, 10) || "∞"}
                    </span>
                );
            },
        },
        {
            key: "status", header: "الحالة", dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${item.status === "active" ? "badge-success" : item.status === "inactive" ? "badge-warning" : "badge-secondary"}`}>
                    {item.status === "active" ? "نشط" : item.status === "inactive" ? "غير نشط" : "مؤرشف"}
                </span>
            ),
        },
        {
            key: "actions", header: "الإجراءات", dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons actions={[
                    { icon: "edit", title: "تعديل", variant: "edit", onClick: () => openEditDialog(item) },
                    { icon: "trash", title: "حذف", variant: "delete", onClick: () => confirmDelete(item.node_uuid) },
                ]} />
            ),
        },
    ];

    return (
        <>
            <div className="sales-card animate-fade">
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" className="form-control" placeholder="بحث بالرمز أو الاسم..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadNodes()} style={{ maxWidth: "200px" }} />
                    <Select value={filterDomain} onChange={(e) => { setFilterDomain(e.target.value); setFilterType(""); }} style={{ maxWidth: "140px" }}>
                        <option value="">جميع المجالات</option>
                        {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: "170px" }}>
                        <option value="">جميع الأنواع</option>
                        {filteredMetaTypes.map((t) => <option key={t.id} value={t.id}>{t.display_name_ar || t.display_name}</option>)}
                    </Select>
                    <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: "120px" }}>
                        <option value="">جميع الحالات</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                        <option value="archived">مؤرشف</option>
                    </Select>
                    <Button variant="secondary" onClick={loadNodes}>بحث</Button>
                    <div style={{ marginRight: "auto", display: "flex", gap: "0.5rem" }}>
                        {selectedUuids.size > 0 && (
                            <Button variant="secondary" icon="edit" onClick={() => setBulkDialog(true)}>
                                تعديل جماعي ({selectedUuids.size})
                            </Button>
                        )}
                        <Button variant="primary" icon="plus" onClick={openAddDialog}>إضافة وحدة</Button>
                    </div>
                </div>

                {/* Select all */}
                {nodes.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <input type="checkbox" checked={selectedUuids.size === nodes.length && nodes.length > 0}
                            onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
                        <span>تحديد الكل ({nodes.length})</span>
                    </div>
                )}

                <Table columns={nodeColumns} data={nodes} keyExtractor={(item) => item.node_uuid} emptyMessage="لا توجد وحدات تنظيمية" isLoading={isLoading} />
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    إجمالي: {nodes.length} وحدة
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog isOpen={formDialog} onClose={() => setFormDialog(false)} title={selectedNode ? "تعديل الوحدة" : "إضافة وحدة تنظيمية"}
                footer={<><Button variant="secondary" onClick={() => setFormDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSubmit}>{selectedNode ? "تحديث" : "إضافة"}</Button></>}>
                <div className="form-row">
                    <div className="form-group">
                        <Select label="نوع الوحدة *" value={formData.node_type_id}
                            onChange={(e) => { setFormData({ ...formData, node_type_id: e.target.value }); setDynamicAttrs({}); }} disabled={!!selectedNode}>
                            {metaTypes.map((t) => <option key={t.id} value={t.id}>{t.display_name_ar || t.display_name} ({t.level_domain})</option>)}
                        </Select>
                    </div>
                    <div className="form-group">
                        <TextInput label="الرمز *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                    </div>
                </div>

                {/* Dynamic Attributes */}
                {getCurrentAttributes().length > 0 && (
                    <>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                            {getIcon("cube")} السمات ({getCurrentAttributes().filter(a => a.is_mandatory).length} إلزامية)
                        </p>
                        <div className="form-row" style={{ flexWrap: "wrap" }}>
                            {getCurrentAttributes().map((attr) => (
                                <div className="form-group" key={attr.attribute_key} style={{ minWidth: "200px" }}>
                                    <TextInput
                                        label={`${attr.attribute_key}${attr.is_mandatory ? " *" : ""}`}
                                        value={dynamicAttrs[attr.attribute_key] || ""}
                                        onChange={(e) => setDynamicAttrs({ ...dynamicAttrs, [attr.attribute_key]: e.target.value })}
                                        placeholder={attr.is_mandatory ? "مطلوب" : "اختياري"}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Effective Dating (SAP Infotype-style) */}
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.75rem 0 0.5rem" }}>
                    {getIcon("calendar")} فترة الصلاحية (Effective Dating)
                </p>
                <div className="form-row">
                    <div className="form-group">
                        <TextInput label="صالح من" type="date" value={formData.valid_from}
                            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <TextInput label="صالح حتى" type="date" value={formData.valid_to}
                            onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })} />
                    </div>
                </div>

                {/* Link to target on create */}
                {!selectedNode && (
                    <div className="form-group">
                        <Select label="ربط بـ (اختياري)" value={formData.target_node_uuid}
                            onChange={(e) => setFormData({ ...formData, target_node_uuid: e.target.value })}>
                            <option value="">بدون ربط</option>
                            {nodes
                                .filter((n) => topologyRules.some((r) => r.source_node_type_id === formData.node_type_id && r.target_node_type_id === n.node_type_id))
                                .map((n) => (
                                    <option key={n.node_uuid} value={n.node_uuid}>
                                        {n.code} - {getTypeLabel(n.node_type_id)} {((n.attributes_json as Record<string, unknown>)?.name as string) ? `(${(n.attributes_json as Record<string, unknown>).name})` : ""}
                                    </option>
                                ))}
                        </Select>
                    </div>
                )}

                <div className="form-group">
                    <Select label="الحالة" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">نشط</option><option value="inactive">غير نشط</option><option value="archived">مؤرشف</option>
                    </Select>
                </div>
            </Dialog>

            {/* Bulk Status Dialog */}
            <Dialog isOpen={bulkDialog} onClose={() => setBulkDialog(false)} title={`تعديل جماعي — ${selectedUuids.size} وحدة`}
                footer={<><Button variant="secondary" onClick={() => setBulkDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleBulkStatus}>تحديث الحالة</Button></>}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    سيتم تحديث حالة {selectedUuids.size} وحدة/وحدات، محاكاةً لعملية Mass Change في SAP.
                </p>
                <Select label="الحالة الجديدة" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                    <option value="active">نشط (Active)</option>
                    <option value="inactive">غير نشط (Inactive)</option>
                    <option value="archived">مؤرشف (Archived)</option>
                </Select>
            </Dialog>

            <ConfirmDialog isOpen={confirmDialog} onClose={() => setConfirmDialog(false)} onConfirm={handleDelete}
                title="تأكيد الحذف" message="هل أنت متأكد من حذف هذه الوحدة؟ إذا كانت مرتبطة بوحدات أخرى، قد تفشل العملية." confirmText="حذف" confirmVariant="danger" />
        </>
    );
}
