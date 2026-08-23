"use client";

import { useI18n } from "@/lib/i18n";
import { PageSubHeader } from "@/components/layout";
import { BadgeLabel, Button, Select, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { JSX, useCallback, useEffect, useState } from "react";
import { DOMAIN_COLORS } from "../(pages)/ui/index";

interface MetaType {
    id: string;
    display_name: string;
    display_name_ar?: string;
    level_domain: string;
}

interface StructureNode {
    node_uuid: string;
    node_type_id: string;
    code: string;
    attributes_json?: Record<string, unknown>;
    status: string;
    meta_type?: MetaType;
    outgoing_links?: StructureLink[];
}

interface StructureLink {
    id: number;
    source_node_uuid: string;
    target_node_uuid: string;
    link_type: string;
    source_node?: StructureNode;
    target_node?: StructureNode;
}

interface TreeNode {
    node: StructureNode;
    children: TreeNode[];
}


const DOMAIN_ICONS: Record<string, string> = {
    Enterprise: "building",
    Financial: "dollar",
    Controlling: "chart-line",
    Logistics: "box",
    Sales: "cart",
    HR: "users",
    Project: "clipboard",
};

export function getDomainColor(domain: string): string {
    return DOMAIN_COLORS[domain] || "#6b7280";
}

export function HierarchyTab() {
    const { t: i18n } = useI18n();
    const [nodes, setNodes] = useState<StructureNode[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<StructureNode | null>(null);
    const [contextData, setContextData] = useState<Record<string, unknown> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filterDomain, setFilterDomain] = useState("");

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [nodesRes, metaRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.NODES),
                fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.META_TYPES),
            ]);
            setNodes((nodesRes.data as StructureNode[]) || []);
            setMetaTypes((metaRes.data as MetaType[]) || []);
        } catch {
            showToast(i18n.catalog["common.general.errorLoadingData"], "error");
        } finally {
            setIsLoading(false);
        }
    }, [i18n.catalog]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const buildTree = useCallback((): TreeNode[] => {
        if (!nodes.length) return [];

        const childMap = new Map<string, string[]>();
        const parentSet = new Set<string>();

        nodes.forEach((n) => {
            const nodeDetail = nodes.find((nd) => nd.node_uuid === n.node_uuid);
            if (nodeDetail) {
                const outLinks = nodeDetail.outgoing_links;
                if (outLinks) {
                    outLinks.forEach((link) => {
                        parentSet.add(link.target_node_uuid);
                        const children = childMap.get(link.target_node_uuid) || [];
                        children.push(n.node_uuid);
                        childMap.set(link.target_node_uuid, children);
                    });
                }
            }
        });

        const nodeMap = new Map(nodes.map((n) => [n.node_uuid, n]));
        const rootNodes = nodes.filter((n) => !parentSet.has(n.node_uuid));

        const buildSubTree = (uuid: string, visited = new Set<string>()): TreeNode | null => {
            if (visited.has(uuid)) return null;
            visited.add(uuid);
            const node = nodeMap.get(uuid);
            if (!node) return null;
            const childUuids = childMap.get(uuid) || [];
            const children = childUuids
                .map((c) => buildSubTree(c, new Set(visited)))
                .filter(Boolean) as TreeNode[];
            return { node, children };
        };

        return rootNodes.map((r) => buildSubTree(r.node_uuid)!).filter(Boolean);
    }, [nodes]);

    const toggleExpand = (uuid: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(uuid)) {
                next.delete(uuid);
            } else {
                next.add(uuid);
            }
            return next;
        });
    };

    const expandAll = () => setExpandedNodes(new Set(nodes.map((n) => n.node_uuid)));
    const collapseAll = () => setExpandedNodes(new Set());

    const loadScopeContext = async (uuid: string) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.SCOPE_CONTEXT(uuid));
            if (res.success) {
                setContextData(res as Record<string, unknown>);
            }
        } catch {
            showToast(i18n.catalog["enterpriseCore.hierarchy.errorLoadingContext"], "error");
        }
    };

    const getTypeLabel = (id: string) =>
        metaTypes.find((t) => t.id === id)?.display_name_ar || metaTypes.find((t) => t.id === id)?.display_name || id;

    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";

    const filteredDomains = [...new Set(metaTypes.map((t) => t.level_domain))].sort();

    const renderTreeNode = (treeNode: TreeNode, depth = 0): JSX.Element => {
        const { node, children } = treeNode;
        const domain = getTypeDomain(node.node_type_id);
        const domainColor = getDomainColor(domain);
        const isExpanded = expandedNodes.has(node.node_uuid);
        const hasChildren = children.length > 0;
        const isSelected = selectedNode?.node_uuid === node.node_uuid;
        const name = (node.attributes_json?.name as string) || node.code;

        if (filterDomain && domain !== filterDomain) return <></>;

        return (
            <div key={node.node_uuid} style={{ marginRight: depth * 24 + "px" }}>
                <div
                    className={`org-tree-node ${isSelected ? "org-tree-node--selected" : ""}`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        marginBottom: "2px",
                        background: isSelected ? "var(--bg-hover)" : "transparent",
                        borderRight: `3px solid ${domainColor}`,
                        transition: "all 0.15s ease",
                    }}
                    onClick={() => {
                        setSelectedNode(node);
                        loadScopeContext(node.node_uuid);
                    }}
                    onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(node.node_uuid);
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px",
                                color: "var(--text-secondary)",
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                transition: "transform 0.15s ease",
                            }}
                        >
                            {getIcon("chevron-right")}
                        </button>
                    ) : (
                        <span style={{ width: "20px", display: "inline-block" }} />
                    )}

                    <span style={{ color: domainColor, fontSize: "1rem" }}>
                        {getIcon(DOMAIN_ICONS[domain] || "cube")}
                    </span>

                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>

                    <span
                        style={{
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: domainColor + "20",
                            color: domainColor,
                            fontWeight: 500,
                        }}
                    >
                        {getTypeLabel(node.node_type_id)}
                    </span>

                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "auto" }}>
                        {node.code}
                    </span>

                    {node.status !== "active" && (
                        <span className="badge badge-secondary" style={{ fontSize: "0.65rem" }}>
                            {node.status}
                        </span>
                    )}
                </div>

                {isExpanded &&
                    children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
        );
    };

    const tree = buildTree();

    if (isLoading) {
        return (
            <div className="sales-card animate-fade" style={{ textAlign: "center", padding: "3rem" }}>
                <div className="loading-spinner" />
                <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>{i18n.catalog["enterpriseCore.hierarchy.loadingOrganizationalStructure"]}</p>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: selectedNode ? "1fr 380px" : "1fr", gap: "1rem" }}>
            {/* Tree Panel */}
            <div className="sales-card animate-fade">
                <PageSubHeader
                    title={i18n.catalog["common.general.organizationalChart"]}
                    titleIcon="tree"
                    actions={
                        <>
                            <Select
                                value={filterDomain}
                                onChange={(e) => setFilterDomain(e.target.value)}
                                options={filteredDomains.map((d) => ({ value: d, label: d }))}
                                placeholder={i18n.catalog["common.general.allFields"]}
                                style={{ maxWidth: "160px" }}
                            />
                            <Button variant="secondary" onClick={expandAll} style={{ fontSize: "0.9rem", minHeight: "45px" }}>
                                {i18n.catalog["enterpriseCore.hierarchy.expandAll"]}</Button>
                            <Button variant="secondary" onClick={collapseAll} style={{ fontSize: "0.9rem", minHeight: "45px" }}>
                                {i18n.catalog["enterpriseCore.hierarchy.collapseAll"]}</Button>
                        </>
                    }
                />

                {/* Domain Legend */}
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {filteredDomains.map((d) => (
                        <BadgeLabel
                            key={d}
                            label={d}
                            color={getDomainColor(d)}
                            setIsFilter={() => setFilterDomain(filterDomain === d ? "" : d)}
                            isFilter={filterDomain === d}
                            bulletStyle="disc"
                            fontSize={0.75}
                        />
                    ))}
                </div>

                {tree.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        <p>{i18n.catalog["enterpriseCore.hierarchy.noOrganizationalUnitsStartAddingUnitsOrganizationalUnits"]}</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                        {tree.map((t) => renderTreeNode(t))}
                    </div>
                )}

                <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "1rem" }}>
                    <span>{nodes.length} {i18n.catalog["common.general.organizationalUnit"]}</span>
                    <span>{metaTypes.length} {i18n.catalog["common.general.type.alternative2"]}</span>
                </div>
            </div>

            {/* Detail Panel */}
            {selectedNode && (
                <div className="sales-card animate-fade" style={{ alignSelf: "start" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4 style={{ margin: 0 }}>{i18n.catalog["enterpriseCore.hierarchy.unitDetails"]}</h4>
                        <button
                            onClick={() => { setSelectedNode(null); setContextData(null); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                        >
                            {getIcon("close")}
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{i18n.catalog["common.general.type.alternative3"]}</span>
                            <div style={{
                                display: "inline-block",
                                marginRight: "0.5rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: getDomainColor(getTypeDomain(selectedNode.node_type_id)) + "20",
                                color: getDomainColor(getTypeDomain(selectedNode.node_type_id)),
                                fontSize: "0.8rem",
                                fontWeight: 600,
                            }}>
                                {getTypeLabel(selectedNode.node_type_id)}
                            </div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{i18n.catalog["common.general.code"]}</span>
                            <p style={{ margin: 0, fontWeight: 600 }}>{selectedNode.code}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{i18n.catalog["common.general.name"]}</span>
                            <p style={{ margin: 0 }}>{(selectedNode.attributes_json?.name as string) || "—"}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{i18n.catalog["common.general.status.alternative2"]}</span>
                            <span className={`badge ${selectedNode.status === "active" ? "badge-success" : "badge-secondary"}`} style={{ marginRight: "4px" }}>
                                {selectedNode.status === "active" ? i18n.catalog["common.general.active"] : selectedNode.status}
                            </span>
                        </div>

                        {selectedNode.attributes_json && Object.keys(selectedNode.attributes_json).filter(k => k !== "name").length > 0 && (
                            <div>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{i18n.catalog["common.general.attributes"]}</span>
                                <div style={{ background: "var(--bg-secondary)", borderRadius: "6px", padding: "0.5rem", fontSize: "0.8rem" }}>
                                    {Object.entries(selectedNode.attributes_json)
                                        .filter(([k]) => k !== "name")
                                        .map(([key, val]) => (
                                            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                                <span style={{ color: "var(--text-muted)" }}>{key}</span>
                                                <span style={{ fontWeight: 500 }}>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Scope Context */}
                        {contextData && (contextData as { resolved?: Record<string, unknown> }).resolved && (
                            <div>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                                    {getIcon("search")} {i18n.catalog["enterpriseCore.hierarchy.derivedContext"]}</span>
                                <div style={{ background: "var(--bg-secondary)", borderRadius: "6px", padding: "0.5rem", fontSize: "0.75rem" }}>
                                    {Object.entries((contextData as { resolved: Record<string, Record<string, unknown>> }).resolved).map(([typeId, data]) => (
                                        <div key={typeId} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid var(--border-color)" }}>
                                            <span style={{ color: getDomainColor(getTypeDomain(typeId)) }}>{getTypeLabel(typeId)}</span>
                                            <span style={{ fontWeight: 500 }}>{data.code as string}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
