"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, showToast, Column, Button, StatsCard } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Select } from "@/components/ui/select";
import { getIcon } from "@/lib/icons";
import { MetaGrid } from "./ui";
import { PageSubHeader } from "@/components/layout";

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
    node: "وحدة تنظيمية",
    link: "ارتباط",
    meta_type: "نوع وحدة",
    topology_rule: "قاعدة ارتباط",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
    created: "إنشاء",
    updated: "تحديث",
    deleted: "حذف",
    status_change: "تغيير حالة",
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
            const res = await fetchAPI(`${API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.CHANGE_HISTORY}?${params}`);
            setHistory((res.history as ChangeRecord[]) || []);
        } catch { showToast("خطأ في تحميل سجل التغييرات", "error"); }
        finally { setIsLoading(false); }
    }, [limit, filterEntity]);

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

            if (diffMins < 1) return "الآن";
            if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
            if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;
            if (diffDays < 7) return `منذ ${diffDays} يوم`;

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

        if (relevantKeys.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>لا توجد تفاصيل</span>;

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
            key: "time", header: "الوقت", dataLabel: "الوقت",
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
            key: "change_type", header: "العملية", dataLabel: "العملية",
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
            key: "entity_type", header: "الكيان", dataLabel: "الكيان",
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
            key: "changed_by", header: "بواسطة", dataLabel: "بواسطة",
            render: (r) => (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{getIcon("user")}</span>
                    <span style={{ fontSize: "0.83rem" }}>{r.changed_by_user?.name || `#${r.changed_by || "—"}`}</span>
                </div>
            ),
        },
        {
            key: "details", header: "التفاصيل", dataLabel: "التفاصيل",
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
                    {expandedId === r.id ? "إخفاء" : "عرض"} {getIcon(expandedId === r.id ? "chevron-up" : "chevron-down")}
                </button>
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                titleIcon="history"
                title="سجل التغييرات (Change Documents — SCDO)"
                subTitle="تتبع جميع التغييرات على الوحدات والارتباطات والقواعد — محاكاة لسجل التغييرات في SAP."
                actions={
                    <>
                        <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} style={{ maxWidth: "160px" }}
                            options={[
                                { value: "", label: "جميع الكيانات" },
                                { value: "node", label: "وحدات تنظيمية" },
                                { value: "link", label: "ارتباطات" },
                                { value: "meta_type", label: "أنواع الوحدات" },
                                { value: "topology_rule", label: "قواعد الارتباط" },
                            ]}
                        />
                        <Select value={String(limit)} onChange={(e) => setLimit(parseInt(e.target.value))} style={{ maxWidth: "120px" }}
                            options={[
                                { value: 25, label: "آخر 25" },
                                { value: 50, label: "آخر 50" },
                                { value: 100, label: "آخر 100" },
                                { value: 200, label: "آخر 200" },
                            ]}
                        />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            يظهر {filteredHistory.length} من {history.length} سجل
                        </span>
                        <Button variant="secondary" onClick={loadHistory} disabled={isLoading}>
                            {isLoading ? "جاري التحميل..." : "تحديث"}
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

            <Table columns={historyColumns} data={filteredHistory} keyExtractor={(r) => String(r.id)} emptyMessage="لا يوجد سجل تغييرات بعد" isLoading={isLoading} />

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
                                {getIcon("search")} تفاصيل التغيير #{record.id}
                            </h4>
                            <button onClick={() => setExpandedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                {getIcon("close")}
                            </button>
                        </div>

                        {/* Change metadata — using MetaGrid */}
                        <div style={{ marginBottom: "1rem" }}>
                            <MetaGrid items={[
                                { label: "الكيان", value: ENTITY_LABELS[record.entity_type] || record.entity_type },
                                { label: "المعرف", value: record.entity_id },
                                { label: "العملية", value: CHANGE_TYPE_LABELS[record.change_type] || record.change_type },
                                { label: "بواسطة", value: record.changed_by_user?.name || `#${record.changed_by || "—"}` },
                                { label: "التوقيت", value: new Date(record.created_at).toLocaleString("ar-SA") },
                                ...(record.change_reason ? [{ label: "السبب", value: record.change_reason }] : []),
                            ]} />
                        </div>

                        {/* Diff View */}
                        <div style={{ display: "grid", gridTemplateColumns: record.old_values && record.new_values ? "1fr 1fr" : "1fr", gap: "1rem" }}>
                            {record.old_values && (
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", marginBottom: "0.35rem" }}>
                                        {getIcon("minus-circle")} القيم السابقة
                                    </div>
                                    {renderDiff(record.old_values, undefined)}
                                </div>
                            )}
                            {record.new_values && (
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.35rem" }}>
                                        {getIcon("plus-circle")} القيم الجديدة
                                    </div>
                                    {renderDiff(undefined, record.new_values)}
                                </div>
                            )}
                        </div>

                        {/* Combined diff for updates */}
                        {record.old_values && record.new_values && (
                            <div style={{ marginTop: "1rem" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.35rem" }}>
                                    {getIcon("edit")} مقارنة التغييرات
                                </div>
                                {renderDiff(record.old_values, record.new_values)}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
