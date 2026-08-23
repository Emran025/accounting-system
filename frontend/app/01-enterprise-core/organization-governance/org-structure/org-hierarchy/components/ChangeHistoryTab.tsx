"use client";

import { useI18n, catalogText, catalogMessage } from "@/lib/i18n";
import { PageSubHeader } from "@/components/layout";
import { Button, Column, StatsCard, Table, showToast } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { useCallback, useEffect, useState } from "react";
import { MetaGrid } from "../(pages)/ui/index";

interface ChangeRecord {
    id: number;
    entity_type: string;
    entity_id: string;
    change_type: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    change_reason?: string;
    changed_by?: number;
    changed_by_user?: { id: number; name: string };
    created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
    node: catalogMessage("common.general.organizationalUnit"),
    link: catalogMessage("enterpriseCore.changehistory.link"),
    meta_type: catalogMessage("enterpriseCore.changehistory.unitType"),
    topology_rule: catalogMessage("enterpriseCore.changehistory.linkingRule"),
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
    created: catalogMessage("common.general.create"),
    updated: catalogMessage("common.general.update"),
    deleted: catalogMessage("common.general.delete"),
    status_change: catalogMessage("enterpriseCore.changehistory.changeStatus"),
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
    created: "#10b981",
    updated: "#3b82f6",
    deleted: "#ef4444",
    status_change: "#f59e0b",
};

const CHANGE_TYPE_ICONS: Record<string, string> = {
    created: "plus-circle",
    updated: "edit",
    deleted: "trash",
    status_change: "refresh",
};

export function ChangeHistoryTab() {
    const { t: i18n } = useI18n();
    const [history, setHistory] = useState<ChangeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterType, setFilterType] = useState("");
    const [filterEntity, setFilterEntity] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [limit, setLimit] = useState(50);

    const loadHistory = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            params.set("limit", String(limit));
            if (filterEntity) {
                params.set("entity_type", filterEntity);
            }
            const res = await fetchAPI(`${API_ENDPOINTS.ENTERPRISE_CORE.ORG.CHANGE_HISTORY}?${params}`);
            setHistory((res.history as ChangeRecord[]) || []);
        } catch { showToast(i18n.catalog["enterpriseCore.changehistory.failedLoadChangeLog"], "error"); }
        finally { setIsLoading(false); }
    }, [limit, filterEntity, i18n.catalog]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const filteredHistory = filterType ? history.filter(h => h.change_type === filterType) : history;

    // Stats
    const statsByType = {
        created: history.filter(h => h.change_type === "created").length,
        updated: history.filter(h => h.change_type === "updated").length,
        deleted: history.filter(h => h.change_type === "deleted").length,
        status_change: history.filter(h => h.change_type === "status_change").length,
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);

            if (diffMins < 1) return i18n.catalog["enterpriseCore.changehistory.now"];
            if (diffMins < 60) return catalogText(i18n, "enterpriseCore.changehistory.minutesAgo", { value0: diffMins });
            if (diffHrs < 24) return catalogText(i18n, "enterpriseCore.changehistory.hoursAgo", { value0: diffHrs });
            if (diffDays < 7) return catalogText(i18n, "enterpriseCore.changehistory.daysAgo", { value0: diffDays });

            return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch { return dateStr; }
    };

    const renderDiff = (oldVals?: Record<string, unknown>, newVals?: Record<string, unknown>) => {
        if (!oldVals && !newVals) return null;

        const allKeys = new Set([
            ...Object.keys(oldVals || {}),
            ...Object.keys(newVals || {}),
        ]);

        // Filter out timestamp/internal fields
        const ignoreKeys = ["created_at", "updated_at", "created_by", "updated_by", "node_uuid"];
        const relevantKeys = [...allKeys].filter(k => !ignoreKeys.includes(k));

        if (relevantKeys.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{i18n.catalog["enterpriseCore.changehistory.noDetails"]}</span>;

        return (
            <div style={{ display: "grid", gap: "4px", fontSize: "0.78rem" }}>
                {relevantKeys.map(key => {
                    const oldVal = oldVals?.[key];
                    const newVal = newVals?.[key];
                    const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                    if (!isChanged && oldVals && newVals) return null;

                    const formatVal = (v: unknown) => {
                        if (v === null || v === undefined) return "—";
                        if (typeof v === "object") return JSON.stringify(v);
                        return String(v);
                    };

                    return (
                        <div key={key} style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "3px 6px", borderRadius: "4px",
                            background: isChanged ? "var(--bg-hover)" : "transparent",
                        }}>
                            <code style={{ minWidth: "140px", color: "var(--text-muted)", fontSize: "0.72rem" }}>{key}</code>
                            {oldVals && (
                                <span style={{
                                    textDecoration: isChanged ? "line-through" : "none",
                                    color: isChanged ? "var(--danger)" : "var(--text-secondary)",
                                    fontSize: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {formatVal(oldVal)}
                                </span>
                            )}
                            {isChanged && oldVals && (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>→</span>
                            )}
                            {newVals && (
                                <span style={{
                                    color: isChanged ? "var(--success)" : "var(--text-secondary)",
                                    fontWeight: isChanged ? 600 : 400, fontSize: "0.75rem",
                                    maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {formatVal(newVal)}
                                </span>
                            )}
                        </div>
                    );
                }).filter(Boolean)}
            </div>
        );
    };

    const historyColumns: Column<ChangeRecord>[] = [
        {
            key: "time", header: i18n.catalog["common.general.time"], dataLabel: i18n.catalog["common.general.time"],
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 500, fontSize: "0.83rem" }}>{formatDate(r.created_at)}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        {new Date(r.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                </div>
            ),
        },
        {
            key: "change_type", header: i18n.catalog["common.general.operation"], dataLabel: i18n.catalog["common.general.operation"],
            render: (r) => {
                const color = CHANGE_TYPE_COLORS[r.change_type] || "#6b7280";
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ color, fontSize: "1rem" }}>{getIcon(CHANGE_TYPE_ICONS[r.change_type] || "edit")}</span>
                        <span style={{
                            padding: "2px 8px", borderRadius: "4px", background: color + "18",
                            color, fontWeight: 600, fontSize: "0.78rem",
                        }}>
                            {CHANGE_TYPE_LABELS[r.change_type] || r.change_type}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "entity_type", header: i18n.catalog["common.general.entity"], dataLabel: i18n.catalog["common.general.entity"],
            render: (r) => (
                <div>
                    <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{ENTITY_LABELS[r.entity_type] || r.entity_type}</span>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        <code>{r.entity_id.length > 12 ? r.entity_id.substring(0, 12) + "..." : r.entity_id}</code>
                    </div>
                </div>
            ),
        },
        {
            key: "changed_by", header: i18n.catalog["common.general.notAvailable.alternative7"], dataLabel: i18n.catalog["common.general.notAvailable.alternative7"],
            render: (r) => (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{getIcon("user")}</span>
                    <span style={{ fontSize: "0.83rem" }}>{r.changed_by_user?.name || `#${r.changed_by || "—"}`}</span>
                </div>
            ),
        },
        {
            key: "details", header: i18n.catalog["common.general.details.alternative2"], dataLabel: i18n.catalog["common.general.details.alternative2"],
            render: (r) => (
                <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    style={{
                        background: "none", border: "1px solid var(--border-color)", borderRadius: "6px",
                        padding: "4px 10px", cursor: "pointer", fontSize: "0.75rem",
                        color: expandedId === r.id ? "var(--primary)" : "var(--text-secondary)",
                        transition: "all 0.15s",
                    }}
                >
                    {expandedId === r.id ? i18n.catalog["common.general.hide"] : i18n.catalog["common.general.view"]} {getIcon(expandedId === r.id ? "chevron-up" : "chevron-down")}
                </button>
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                titleIcon="history"
                title={i18n.catalog["enterpriseCore.changehistory.changeDocumentsScdo"]}
                subTitle={i18n.catalog["enterpriseCore.changehistory.trackAllChangesUnitsLinksRulesSimulation"]}
                actions={
                    <>
                        <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} style={{ maxWidth: "160px" }}
                            options={[
                                { value: "", label: i18n.catalog["enterpriseCore.changehistory.allEntities"] },
                                { value: "node", label: i18n.catalog["enterpriseCore.changehistory.organizationalUnits"] },
                                { value: "link", label: i18n.catalog["enterpriseCore.changehistory.links"] },
                                { value: "meta_type", label: i18n.catalog["common.general.typesUnits"] },
                                { value: "topology_rule", label: i18n.catalog["common.general.linkingRules"] },
                            ]}
                        />
                        <Select value={String(limit)} onChange={(e) => setLimit(parseInt(e.target.value))} style={{ maxWidth: "120px" }}
                            options={[
                                { value: 25, label: i18n.catalog["enterpriseCore.changehistory.last25"] },
                                { value: 50, label: i18n.catalog["enterpriseCore.changehistory.last50"] },
                                { value: 100, label: i18n.catalog["enterpriseCore.changehistory.last100"] },
                                { value: 200, label: i18n.catalog["enterpriseCore.changehistory.last200"] },
                            ]}
                        />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {i18n.catalog["enterpriseCore.changehistory.visible"]}{filteredHistory.length} {i18n.catalog["common.general.notAvailable.alternative2"]}{history.length} {i18n.catalog["enterpriseCore.changehistory.log"]}</span>
                        <Button variant="secondary" onClick={loadHistory} disabled={isLoading}>
                            {isLoading ? i18n.catalog["common.general.loading"] : i18n.catalog["common.general.update"]}
                        </Button>
                    </>
                }
            />

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {(["created", "updated", "deleted", "status_change"] as const).map(type => {
                    const isActive = filterType === type;
                    return (
                        <StatsCard
                            hight={80}
                            key={type}
                            title={CHANGE_TYPE_LABELS[type]}
                            value={statsByType[type]}
                            icon={getIcon(CHANGE_TYPE_ICONS[type])}
                            colorClass={
                                type === "created" ? "products" :
                                    type === "updated" ? "sales" :
                                        type === "deleted" ? "alert" :
                                            "default"
                            }
                            onClick={() => setFilterType(isActive ? "" : type)}
                        />
                    );
                })}
            </div>

            <Table columns={historyColumns} data={filteredHistory} keyExtractor={(r) => String(r.id)} emptyMessage={i18n.catalog["enterpriseCore.changehistory.noChangeLogYet"]} isLoading={isLoading} />

            {/* Expanded Detail */}
            {expandedId && (() => {
                const record = filteredHistory.find(r => r.id === expandedId);
                if (!record) return null;

                return (
                    <div style={{
                        marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
                                {getIcon("search")} {i18n.catalog["enterpriseCore.changehistory.changeDetails"]}{record.id}
                            </h4>
                            <button onClick={() => setExpandedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                {getIcon("close")}
                            </button>
                        </div>

                        {/* Change metadata — using MetaGrid */}
                        <div style={{ marginBottom: "1rem" }}>
                            <MetaGrid items={[
                                { label: i18n.catalog["common.general.entity"], value: ENTITY_LABELS[record.entity_type] || record.entity_type },
                                { label: i18n.catalog["common.general.identifier"], value: record.entity_id },
                                { label: i18n.catalog["common.general.operation"], value: CHANGE_TYPE_LABELS[record.change_type] || record.change_type },
                                { label: i18n.catalog["common.general.notAvailable.alternative7"], value: record.changed_by_user?.name || `#${record.changed_by || "—"}` },
                                { label: i18n.catalog["enterpriseCore.changehistory.timing"], value: new Date(record.created_at).toLocaleString("ar-SA") },
                                ...(record.change_reason ? [{ label: i18n.catalog["common.general.reason"], value: record.change_reason }] : []),
                            ]} />
                        </div>

                        {/* Diff View */}
                        <div style={{ display: "grid", gridTemplateColumns: record.old_values && record.new_values ? "1fr 1fr" : "1fr", gap: "1rem" }}>
                            {record.old_values && (
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", marginBottom: "0.35rem" }}>
                                        {getIcon("minus-circle")} {i18n.catalog["enterpriseCore.changehistory.previousValues"]}</div>
                                    {renderDiff(record.old_values, undefined)}
                                </div>
                            )}
                            {record.new_values && (
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.35rem" }}>
                                        {getIcon("plus-circle")} {i18n.catalog["enterpriseCore.changehistory.newValues"]}</div>
                                    {renderDiff(undefined, record.new_values)}
                                </div>
                            )}
                        </div>

                        {/* Combined diff for updates */}
                        {record.old_values && record.new_values && (
                            <div style={{ marginTop: "1rem" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.35rem" }}>
                                    {getIcon("edit")} {i18n.catalog["enterpriseCore.changehistory.compareChanges"]}</div>
                                {renderDiff(record.old_values, record.new_values)}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
