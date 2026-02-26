"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, showToast, Column, Select } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { PageSubHeader } from "@/components/layout";

interface MetaType { id: string; display_name: string; display_name_ar?: string; level_domain: string; }
interface TopologyRule {
    id: number; source_node_type_id: string; target_node_type_id: string;
    cardinality: string; description?: string; link_direction: string; is_active: boolean;
    constraint_logic?: { rules?: { type: string; source_attr: string; target_attr: string; operator: string }[] };
    source_type?: MetaType; target_type?: MetaType;
}

const CARDINALITY_COLORS: Record<string, string> = {
    "1:1": "#10b981", "1:N": "#3b82f6", "N:1": "#f59e0b", "N:M": "#ef4444",
};

export function TopologyRulesTab() {
    const [rules, setRules] = useState<TopologyRule[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterDomain, setFilterDomain] = useState("");

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [rulesRes, metaRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.TOPOLOGY_RULES),
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.META_TYPES),
            ]);
            setRules((rulesRes.topology_rules as TopologyRule[]) || []);
            setMetaTypes((metaRes.meta_types as MetaType[]) || []);
        } catch { showToast("خطأ في تحميل القواعد", "error"); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const getTypeLabel = (id: string) => metaTypes.find((t) => t.id === id)?.display_name_ar || id;
    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";

    const filteredRules = filterDomain
        ? rules.filter((r) => getTypeDomain(r.source_node_type_id) === filterDomain || getTypeDomain(r.target_node_type_id) === filterDomain)
        : rules;

    const domains = [...new Set(metaTypes.map((t) => t.level_domain))].sort();

    const topologyColumns: Column<TopologyRule>[] = [
        {
            key: "source", header: "المصدر (Source)", dataLabel: "المصدر",
            render: (r) => <span style={{ fontWeight: 600 }}>{r.source_type?.display_name_ar || getTypeLabel(r.source_node_type_id)}</span>,
        },
        {
            key: "cardinality", header: "العلاقة", dataLabel: "العلاقة",
            render: (r) => {
                const color = CARDINALITY_COLORS[r.cardinality] || "#6b7280";
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", background: color + "18", color, fontWeight: 700, fontSize: "0.85rem" }}>
                            {r.cardinality}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                    </div>
                );
            },
        },
        {
            key: "target", header: "الهدف (Target)", dataLabel: "الهدف",
            render: (r) => <span style={{ fontWeight: 600 }}>{r.target_type?.display_name_ar || getTypeLabel(r.target_node_type_id)}</span>,
        },
        { key: "description", header: "الوصف", dataLabel: "الوصف", render: (r) => <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{r.description || "—"}</span> },
        {
            key: "constraints", header: "القيود", dataLabel: "القيود",
            render: (r) => {
                const constraints = r.constraint_logic?.rules || [];
                if (!constraints.length) return <span style={{ color: "var(--text-muted)" }}>—</span>;
                return (
                    <div>
                        {constraints.map((c, i) => (
                            <span key={i} className="badge badge-warning" style={{ fontSize: "0.65rem", marginLeft: "4px" }}>
                                {c.source_attr} {c.operator} {c.target_attr}
                            </span>
                        ))}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="قواعد الارتباط (Topology Rules)"
                subTitle="القواعد التي تحكم العلاقات المسموحة بين أنواع الوحدات التنظيمية — بما يحاكي SAP SPRO"
                titleIcon="route"
                actions={
                    <>
                        <Select
                            value={filterDomain}
                            onChange={(e) => setFilterDomain(e.target.value)}
                            options={domains.map((d) => ({
                                value: d,
                                label: d,
                            }))}
                            className="form-control"
                            style={{
                                maxWidth: "200px",
                                fontSize: "1rem"
                            }}
                            placeholder="اختر وحدة..."
                        />
                    </>
                }
            />

            {/* Cardinality Legend */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {Object.entries(CARDINALITY_COLORS).map(([card, color]) => (
                    <span key={card} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem" }}>
                        <span style={{ width: 12, height: 12, borderRadius: "3px", background: color + "30", border: `1px solid ${color}`, display: "inline-block" }} />
                        <strong style={{ color }}>{card}</strong>
                        <span style={{ color: "var(--text-muted)" }}>
                            {card === "1:1" ? "واحد-لواحد" : card === "1:N" ? "واحد-لعدة" : card === "N:1" ? "عدة-لواحد" : "عدة-لعدة"}
                        </span>
                    </span>
                ))}
            </div>

            <Table columns={topologyColumns} data={filteredRules} keyExtractor={(r) => String(r.id)} emptyMessage="لا توجد قواعد" isLoading={isLoading} />

            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                إجمالي: {filteredRules.length} قاعدة من {rules.length}
            </div>
        </div>
    );
}
