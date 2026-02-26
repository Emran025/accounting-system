"use client";

import { useState, useEffect, useCallback } from "react";
import { ActionButtons, Table, ConfirmDialog, showToast, Column, Button, Checkbox, SearchableSelect, Dialog } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Select } from "@/components/ui/select";
import { PageSubHeader } from "@/components/layout";
import { NodeFormDialog, InitialNodeSetup, NodeFormData } from "./NodeFormPanel";

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
    const [isSubmitting, setIsSubmitting] = useState(false);
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
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [formData, setFormData] = useState<NodeFormData>({
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
            setInitialDataLoaded(true);
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
        setIsSubmitting(true);
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
        } finally {
            setIsSubmitting(false);
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

    // Shared form props for both dialog and inline wizard
    const formProps = {
        formData, setFormData, dynamicAttrs, setDynamicAttrs,
        metaTypes, nodes, topologyRules, selectedNode, getTypeLabel,
    };

    const nodeColumns: Column<StructureNode>[] = [
        {
            key: "select", header: "", dataLabel: "",
            render: (item) => (
                <Checkbox
                    checked={selectedUuids.has(item.node_uuid)}
                    onChange={() => toggleSelect(item.node_uuid)}
                />
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
                <ActionButtons
                    actions={[
                        { icon: "edit", title: "تعديل", variant: "edit", onClick: () => openEditDialog(item) },
                        { icon: "trash", title: "حذف", variant: "delete", onClick: () => confirmDelete(item.node_uuid) },
                    ]}
                />
            ),
        },
    ];

    /* ────────────────────────────────────────────── */
    /*  Initial Setup Experience (zero nodes)         */
    /* ────────────────────────────────────────────── */
    const showInitialSetup = initialDataLoaded && !isLoading && nodes.length === 0 && metaTypes.length > 0;

    if (showInitialSetup && !formDialog) {
        return (
            <>
                <InitialNodeSetup
                    {...formProps}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </>
        );
    }

    return (
        <>
            <div className="sales-card animate-fade">

                <PageSubHeader
                    title="إدارة الوحدات التنظيمية"
                    subTitle="استعراض وإدارة جميع الوحدات التنظيمية في الهيكل."
                    titleIcon="sitemap"
                    searchInput={
                        <SearchableSelect
                            value={null}
                            options={nodes.map(n => ({
                                value: n.node_uuid,
                                label: `${n.code} - ${(n.attributes_json as any)?.name || ''}`,
                                subtitle: getTypeLabel(n.node_type_id)
                            }))}
                            onChange={(val) => {
                                if (val) {
                                    const node = nodes.find(n => n.node_uuid === val);
                                    if (node) openEditDialog(node);
                                }
                            }}
                            onSearch={(term) => setSearchTerm(term)}
                            placeholder="بحث بالرمز أو الاسم..."
                        />
                    }
                    actions={
                        <>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                {selectedUuids.size > 0 && (
                                    <Button variant="secondary" icon="edit" onClick={() => setBulkDialog(true)}>
                                        تعديل جماعي ({selectedUuids.size})
                                    </Button>
                                )}
                                <Button variant="primary" icon="plus" onClick={openAddDialog}>إضافة وحدة</Button>
                            </div>
                        </>
                    }
                />
                <PageSubHeader
                    searchInput={
                        nodes.length > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                <Checkbox
                                    checked={selectedUuids.size === nodes.length && nodes.length > 0}
                                    onChange={toggleSelectAll}
                                    label={`تحديد الكل (${nodes.length})`}
                                />
                            </div>
                        ) : (<Select
                            value={filterDomain}
                            onChange={(e) => { setFilterDomain(e.target.value); setFilterType(""); }}
                            style={{ maxWidth: "220px" }}
                            options={[
                                { value: "", label: "جميع المجالات" },
                                ...domains.map((d) => ({ value: d, label: d }))
                            ]}
                        />)
                    }
                    actions={
                        <>
                            {nodes.length > 0 && (<Select
                                value={filterDomain}
                                onChange={(e) => { setFilterDomain(e.target.value); setFilterType(""); }}
                                style={{ maxWidth: "220px" }}
                                options={[
                                    { value: "", label: "جميع المجالات" },
                                    ...domains.map((d) => ({ value: d, label: d }))
                                ]}
                            />)}

                            <Select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{ maxWidth: "220px" }}
                                options={[
                                    { value: "", label: "جميع الأنواع" },
                                    ...filteredMetaTypes.map((t) => ({ value: t.id, label: t.display_name_ar || t.display_name })),
                                ]}
                            />
                            <Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ maxWidth: "220px" }}
                                options={
                                    [
                                        { value: "", label: "جميع الحالات" },
                                        { value: "active", label: "نشط" },
                                        { value: "inactive", label: "غير نشط" },
                                        { value: "archived", label: "مؤرشف" },
                                    ]
                                }

                            />
                            <Button variant="secondary" onClick={loadNodes}>بحث</Button>
                        </>
                    }
                />

                <Table columns={nodeColumns} data={nodes} keyExtractor={(item) => item.node_uuid} emptyMessage="لا توجد وحدات تنظيمية" isLoading={isLoading} />
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    إجمالي: {nodes.length} وحدة
                </div>
            </div >

            {/* Add/Edit Dialog */}
            <NodeFormDialog
                isOpen={formDialog}
                onClose={() => setFormDialog(false)}
                onSubmit={handleSubmit}
                {...formProps}
            />

            {/* Bulk Status Dialog */}
            <Dialog
                isOpen={bulkDialog}
                onClose={() => setBulkDialog(false)}
                title={`تعديل جماعي — ${selectedUuids.size} وحدة`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setBulkDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleBulkStatus}>تحديث الحالة</Button>
                    </>
                }
            >
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    سيتم تحديث حالة {selectedUuids.size} وحدة/وحدات، محاكاةً لعملية Mass Change في SAP.
                </p>
                <Select label="الحالة الجديدة" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                    options={
                        [
                            { value: "active", label: "نشط (Active)" },
                            { value: "inactive", label: "غير نشط (Inactive)" },
                            { value: "archived", label: "مؤرشف (Archived)" },
                        ]
                    }
                />
            </Dialog>

            <ConfirmDialog isOpen={confirmDialog} onClose={() => setConfirmDialog(false)} onConfirm={handleDelete}
                title="تأكيد الحذف" message="هل أنت متأكد من حذف هذه الوحدة؟ إذا كانت مرتبطة بوحدات أخرى، قد تفشل العملية." confirmText="حذف" confirmVariant="danger" />
        </>
    );
}
