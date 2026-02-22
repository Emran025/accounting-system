"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, showToast, Column } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface MetaType {
    id: string; display_name: string; display_name_ar?: string;
    level_domain: string; description?: string; is_assignable: boolean; sort_order: number;
    attributes?: { attribute_key: string; is_mandatory: boolean; attribute_type: string; sort_order: number }[];
}

const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6", Financial: "#3b82f6", Controlling: "#06b6d4",
    Logistics: "#10b981", Sales: "#f59e0b", HR: "#ec4899", Project: "#6366f1",
};

export function MetaTypesTab() {
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedType, setExpandedType] = useState<string | null>(null);
    const [filterDomain, setFilterDomain] = useState("");

    const loadMetaTypes = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.META_TYPES);
            setMetaTypes((response.meta_types as MetaType[]) || []);
        } catch { showToast("خطأ في تحميل أنواع الوحدات", "error"); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadMetaTypes(); }, [loadMetaTypes]);

    const domains = [...new Set(metaTypes.map((t) => t.level_domain))].sort();
    const filtered = filterDomain ? metaTypes.filter((t) => t.level_domain === filterDomain) : metaTypes;

    const metaTypeColumns: Column<MetaType>[] = [
        { key: "id", header: "المعرف", dataLabel: "المعرف", render: (t) => <code style={{ fontSize: "0.8rem" }}>{t.id}</code> },
        { key: "display_name", header: "الاسم (English)", dataLabel: "الاسم" },
        { key: "display_name_ar", header: "الاسم (عربي)", dataLabel: "الاسم العربي" },
        {
            key: "level_domain", header: "المجال", dataLabel: "المجال",
            render: (t) => {
                const color = DOMAIN_COLORS[t.level_domain] || "#6b7280";
                return (
                    <span style={{ padding: "2px 8px", borderRadius: "4px", background: color + "18", color, fontWeight: 600, fontSize: "0.8rem" }}>
                        {t.level_domain}
                    </span>
                );
            },
        },
        {
            key: "attributes_count", header: "السمات", dataLabel: "السمات",
            render: (t) => {
                const total = t.attributes?.length || 0;
                const mandatory = t.attributes?.filter((a) => a.is_mandatory).length || 0;
                return (
                    <span style={{ fontSize: "0.8rem", cursor: "pointer", color: "var(--primary)" }} onClick={() => setExpandedType(expandedType === t.id ? null : t.id)}>
                        {total} ({mandatory} إلزامية) {getIcon(expandedType === t.id ? "chevron-up" : "chevron-down")}
                    </span>
                );
            },
        },
        {
            key: "is_assignable", header: "قابل للربط", dataLabel: "قابل للربط",
            render: (t) => t.is_assignable ? (
                <span style={{ color: "var(--success)" }}>{getIcon("check")}</span>
            ) : (
                <span style={{ color: "var(--text-muted)" }}>{getIcon("close")}</span>
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{getIcon("cube")} أنواع الوحدات التنظيمية (Meta Types)</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "4px 0 0" }}>
                        أنواع الوحدات التنظيمية المعرّفة في النظام — تتوافق مع تعريفات SAP SPRO
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <select className="form-control" value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} style={{ maxWidth: "150px", fontSize: "0.8rem" }}>
                        <option value="">جميع المجالات</option>
                        {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Domain Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
                {domains.map((d) => {
                    const count = metaTypes.filter((t) => t.level_domain === d).length;
                    const color = DOMAIN_COLORS[d] || "#6b7280";
                    return (
                        <div key={d}
                            style={{
                                padding: "0.5rem 0.75rem", borderRadius: "8px", background: color + "10", border: `1px solid ${color}30`,
                                cursor: "pointer", transition: "all 0.15s", opacity: !filterDomain || filterDomain === d ? 1 : 0.5,
                            }}
                            onClick={() => setFilterDomain(filterDomain === d ? "" : d)}>
                            <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{count}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{d}</div>
                        </div>
                    );
                })}
            </div>

            <Table columns={metaTypeColumns} data={filtered} keyExtractor={(t) => t.id} emptyMessage="لا توجد أنواع" isLoading={isLoading} />

            {/* Expanded Attributes for selected type */}
            {expandedType && (
                <div style={{ marginTop: "1rem", background: "var(--bg-secondary)", borderRadius: "8px", padding: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem" }}>
                        سمات: {metaTypes.find((t) => t.id === expandedType)?.display_name_ar || expandedType}
                    </h4>
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                        {metaTypes.find((t) => t.id === expandedType)?.attributes?.map((attr) => (
                            <div key={attr.attribute_key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
                                <code style={{ fontSize: "0.8rem", minWidth: "180px" }}>{attr.attribute_key}</code>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{attr.attribute_type}</span>
                                {attr.is_mandatory && <span className="badge badge-danger" style={{ fontSize: "0.65rem" }}>إلزامي</span>}
                            </div>
                        )) || <p style={{ color: "var(--text-muted)", margin: 0 }}>لا توجد سمات</p>}
                    </div>
                </div>
            )}

            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                إجمالي: {filtered.length} نوع من {metaTypes.length}
            </div>
        </div>
    );
}
