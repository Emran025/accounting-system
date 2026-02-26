"use client";

import { useState, useCallback, useEffect } from "react";
import { showToast, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Select } from "@/components/ui/select";
import { getIcon } from "@/lib/icons";
import { PageSubHeader } from "@/components/layout";

interface MetaType { id: string; display_name: string; display_name_ar?: string; level_domain: string; }
interface StructureNode { node_uuid: string; node_type_id: string; code: string; attributes_json?: Record<string, unknown>; }

interface ScopeResult {
    anchor: { node_uuid: string; node_type_id: string; code: string; attributes: Record<string, any> };
    resolved: Record<string, { node_uuid: string; code: string; attributes: Record<string, any> }>;
}

const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6", Financial: "#3b82f6", Controlling: "#06b6d4",
    Logistics: "#10b981", Sales: "#f59e0b", HR: "#ec4899", Project: "#6366f1",
};

export function ScopeContextTab() {
    const [nodes, setNodes] = useState<StructureNode[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [selectedUuid, setSelectedUuid] = useState("");
    const [result, setResult] = useState<ScopeResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadNodes = useCallback(async () => {
        try {
            const [nodesRes, metaRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.NODES),
                fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.META_TYPES),
            ]);
            setNodes((nodesRes.nodes as StructureNode[]) || []);
            setMetaTypes((metaRes.meta_types as MetaType[]) || []);
        } catch { showToast("خطأ في تحميل البيانات", "error"); }
    }, []);

    useEffect(() => { loadNodes(); }, [loadNodes]);

    const getTypeLabel = (id: string) => metaTypes.find((t) => t.id === id)?.display_name_ar || metaTypes.find((t) => t.id === id)?.display_name || id;
    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";

    const resolveScope = async () => {
        if (!selectedUuid) { showToast("يرجى اختيار وحدة", "error"); return; }
        try {
            setIsLoading(true);
            const res = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.SCOPE_CONTEXT(selectedUuid));
            if (res.success) {
                setResult(res as unknown as ScopeResult);
            }
        } catch { showToast("خطأ في تحليل السياق", "error"); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="تحليل السياق التنظيمي (Scope Context Resolution)"
                subTitle="إذا كنت في وحدة معيّنة (مثلاً مصنع)، ما هو رمز الشركة والعملة ومنطقة التحكم؟"
                titleIcon="search"
                actions={
                    <>
                        <Select
                            value={selectedUuid}
                            onChange={(e) => setSelectedUuid(e.target.value)}
                            options={nodes.map((n) => ({
                                value: n.node_uuid,
                                label: `${n.code} — ${getTypeLabel(n.node_type_id)}${n.attributes_json?.name ? ` (${n.attributes_json.name})` : ""}`,
                            }))}
                            style={{
                                maxWidth: "200px",
                                fontSize: "1rem"
                            }}
                            className="form-control"
                            placeholder="اختر وحدة..."
                        />

                        <Button variant="primary" icon="search" onClick={resolveScope} disabled={!selectedUuid || isLoading}>
                            {isLoading ? "جاري التحليل..." : "تحليل السياق"}
                        </Button>
                    </>
                }
            />

            {result && (
                <div style={{ display: "grid", gap: "1rem" }}>
                    {/* Anchor */}
                    <div style={{ padding: "1rem", borderRadius: "10px", background: "var(--primary)" + "12", border: "1px solid var(--primary)" + "40" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>الوحدة المرجعية (Anchor)</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>{getIcon("pin")}</span>
                            <strong style={{ fontSize: "1.1rem" }}>{result.anchor.code}</strong>
                            <span style={{
                                padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600,
                                background: DOMAIN_COLORS[getTypeDomain(result.anchor.node_type_id)] + "20",
                                color: DOMAIN_COLORS[getTypeDomain(result.anchor.node_type_id)],
                            }}>
                                {getTypeLabel(result.anchor.node_type_id)}
                            </span>
                        </div>
                        {Object.keys(result.anchor.attributes || {}).length > 0 && (
                            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {Object.entries(result.anchor.attributes).map(([k, v]) => (
                                    <span key={k} style={{ marginLeft: "1rem" }}><strong>{k}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resolved Chain */}
                    <div>
                        <h4 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                            {getIcon("tree")} السياق المُستنبط ({Object.keys(result.resolved).length} وحدة)
                        </h4>
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {Object.entries(result.resolved).map(([typeId, data]) => {
                                const domain = getTypeDomain(typeId);
                                const color = DOMAIN_COLORS[domain] || "#6b7280";
                                const isAnchor = typeId === result.anchor.node_type_id;
                                return (
                                    <div key={typeId} style={{
                                        display: "flex", alignItems: "center", gap: "0.75rem",
                                        padding: "0.75rem 1rem", borderRadius: "8px", borderRight: `4px solid ${color}`,
                                        background: isAnchor ? color + "08" : "var(--bg-secondary)",
                                        transition: "all 0.15s",
                                    }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                                        <div style={{ minWidth: "180px" }}>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{domain}</span>
                                            <div style={{ fontWeight: 600, color }}>{getTypeLabel(typeId)}</div>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{data.code}</span>
                                            {data.attributes?.name && (
                                                <span style={{ marginRight: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                                    — {data.attributes.name}
                                                </span>
                                            )}
                                        </div>
                                        {Object.entries(data.attributes || {}).filter(([k]) => k !== "name").length > 0 && (
                                            <div style={{ marginRight: "auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                {Object.entries(data.attributes).filter(([k]) => k !== "name").map(([k, v]) => (
                                                    <span key={k} style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                                                        {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {isAnchor && <span className="badge badge-primary" style={{ fontSize: "0.65rem" }}>المرجع</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {!result && !isLoading && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>{getIcon("search")}</div>
                    <p>اختر وحدة تنظيمية ثم اضغط "تحليل السياق" لعرض كل الوحدات المرتبطة بها في الشجرة.</p>
                    <p style={{ fontSize: "0.8rem" }}>مثال: اختر مصنع لمعرفة رمز الشركة التابع له والعملة ومنطقة التحكم.</p>
                </div>
            )}
        </div>
    );
}
