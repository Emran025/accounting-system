"use client";

import { useI18n, catalogText } from "@/lib/i18n";
import { PageSubHeader } from "@/components/layout";
import { Button, showToast } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { useCallback, useEffect, useState } from "react";
import { DOMAIN_COLORS } from "../(pages)/ui/index";

interface MetaType { id: string; display_name: string; display_name_ar?: string; level_domain: string; }
interface StructureNode { node_uuid: string; node_type_id: string; code: string; attributes_json?: Record<string, unknown>; }

type ScopeAttributes = Record<string, unknown>;

interface ScopeResult {
    anchor: { node_uuid: string; node_type_id: string; code: string; attributes: ScopeAttributes };
    resolved: Record<string, { node_uuid: string; code: string; attributes: ScopeAttributes }>;
}

function displayAttributeValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return typeof value === "object" ? JSON.stringify(value) ?? "" : String(value);
}

export function ScopeContextTab() {
    const { t: i18n } = useI18n();
    const [nodes, setNodes] = useState<StructureNode[]>([]);
    const [metaTypes, setMetaTypes] = useState<MetaType[]>([]);
    const [selectedUuid, setSelectedUuid] = useState("");
    const [result, setResult] = useState<ScopeResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadNodes = useCallback(async () => {
        try {
            const [nodesRes, metaRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.NODES),
                fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.META_TYPES),
            ]);
            setNodes((nodesRes.data as StructureNode[]) || []);
            setMetaTypes((metaRes.data as MetaType[]) || []);
        } catch { showToast(i18n.catalog["common.general.errorLoadingData"], "error"); }
    }, [i18n.catalog]);

    useEffect(() => { loadNodes(); }, [loadNodes]);

    const getTypeLabel = (id: string) => metaTypes.find((t) => t.id === id)?.display_name_ar || metaTypes.find((t) => t.id === id)?.display_name || id;
    const getTypeDomain = (id: string) => metaTypes.find((t) => t.id === id)?.level_domain || "";

    const resolveScope = async () => {
        if (!selectedUuid) { showToast(i18n.catalog["enterpriseCore.scopecontext.pleaseSelectUnit"], "error"); return; }
        try {
            setIsLoading(true);
            const res = await fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.ORG.SCOPE_CONTEXT(selectedUuid));
            if (res.success) {
                setResult(res as unknown as ScopeResult);
            }
        } catch { showToast(i18n.catalog["enterpriseCore.scopecontext.errorParsingContext"], "error"); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={i18n.catalog["enterpriseCore.scopecontext.organizationalContextAnalysisScopeContextResolution"]}
                subTitle={i18n.catalog["enterpriseCore.scopecontext.ifYouAreSpecificUnitEGPlantWhat"]}
                titleIcon="search"
                actions={
                    <>
                        <Select
                            value={selectedUuid}
                            onChange={(e) => setSelectedUuid(e.target.value)}
                            options={nodes.map((n) => ({
                                value: n.node_uuid,
                                label: catalogText(i18n, "enterpriseCore.scopecontext.notAvailable", { value0: n.code, value1: getTypeLabel(n.node_type_id), value2: n.attributes_json?.name ? catalogText(i18n, "common.general.message.alternative2", { value0: n.attributes_json.name }) : "" }),
                            }))}
                            style={{
                                maxWidth: "200px",
                                fontSize: "1rem"
                            }}
                            className="form-control"
                            placeholder={i18n.catalog["common.general.selectUnit"]}
                        />
                        <Button variant="primary" icon="search" onClick={resolveScope} disabled={!selectedUuid || isLoading}>
                            {isLoading ? i18n.catalog["enterpriseCore.scopecontext.analyzing"] : i18n.catalog["common.general.contextAnalysis"]}
                        </Button>
                    </>
                }
            />

            {result && (
                <div style={{ display: "grid", gap: "1rem" }}>
                    {/* Anchor */}
                    <div style={{ padding: "1rem", borderRadius: "10px", background: "var(--primary)" + "12", border: "1px solid var(--primary)" + "40" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>{i18n.catalog["enterpriseCore.scopecontext.referenceUnitAnchor"]}</div>
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
                            {getIcon("tree")} {i18n.catalog["enterpriseCore.scopecontext.derivedContext"]}{Object.keys(result.resolved).length} {i18n.catalog["enterpriseCore.scopecontext.unit"]}</h4>
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
                                            {displayAttributeValue(data.attributes?.name) && (
                                                <span style={{ marginRight: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                                    — {displayAttributeValue(data.attributes?.name)}
                                                </span>
                                            )}
                                        </div>
                                        {Object.entries(data.attributes || {}).filter(([k]) => k !== "name").length > 0 && (
                                            <div style={{ marginRight: "auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                {Object.entries(data.attributes).filter(([k]) => k !== "name").map(([k, v]) => (
                                                    <span key={k} style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                                                        {k}: {displayAttributeValue(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {isAnchor && <span className="badge badge-primary" style={{ fontSize: "0.65rem" }}>{i18n.catalog["common.general.reference"]}</span>}
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
                    <p>{i18n.catalog["enterpriseCore.scopecontext.selectOrganizationalUnitThenClickAnalyzeContextShow"]}</p>
                    <p style={{ fontSize: "0.8rem" }}>{i18n.catalog["enterpriseCore.scopecontext.exampleSelectPlantViewItsCompanyCodeCurrency"]}</p>
                </div>
            )}
        </div>
    );
}
