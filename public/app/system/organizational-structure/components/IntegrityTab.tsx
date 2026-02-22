"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Button, showToast } from "@/components/ui";
import { getIcon } from "@/lib/icons";

interface IntegrityIssue {
    type: "ERROR" | "WARNING" | "INFO";
    category: string;
    message: string;
    message_ar?: string;
    node_uuid?: string;
    node_code?: string;
    node_type?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    missing_attribute: "سمات إجبارية مفقودة",
    orphan_node: "وحدات معزولة",
    missing_parent: "ارتباطات إجبارية مفقودة",
    cardinality_violation: "مخالفات تعدد العلاقات",
    expired_link: "ارتباطات منتهية الصلاحية",
    inactive_with_links: "وحدات غير نشطة لها ارتباطات",
};

const TYPE_COLORS: Record<string, string> = {
    ERROR: "var(--danger)",
    WARNING: "#f59e0b",
    INFO: "var(--primary)",
};

const TYPE_ICONS: Record<string, string> = {
    ERROR: "exclamation-circle",
    WARNING: "warning",
    INFO: "info-circle",
};

export function IntegrityTab() {
    const [issues, setIssues] = useState<IntegrityIssue[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [summary, setSummary] = useState({ total: 0, errors: 0, warnings: 0, info: 0 });
    const [filterType, setFilterType] = useState<string>("");
    const [filterCategory, setFilterCategory] = useState<string>("");

    const runScan = useCallback(async () => {
        try {
            setIsScanning(true);
            setIssues([]);

            const res = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.INTEGRITY_CHECK);

            if (res.success) {
                setIssues((res.issues as IntegrityIssue[]) || []);
                setSummary({
                    total: res.total as number || 0,
                    errors: res.errors as number || 0,
                    warnings: res.warnings as number || 0,
                    info: res.info as number || 0,
                });
                showToast(`اكتمل الفحص. تم العثور على ${res.total} ملاحظة`, "info");
            }
        } catch {
            showToast("فشل تشغيل فحص السلامة", "error");
        } finally {
            setIsScanning(false);
        }
    }, []);

    useEffect(() => { runScan(); }, [runScan]);

    const categories = [...new Set(issues.map(i => i.category))].sort();

    const filteredIssues = issues.filter(i => {
        if (filterType && i.type !== filterType) return false;
        if (filterCategory && i.category !== filterCategory) return false;
        return true;
    });

    const groupedByCategory = filteredIssues.reduce((acc, issue) => {
        if (!acc[issue.category]) acc[issue.category] = [];
        acc[issue.category].push(issue);
        return acc;
    }, {} as Record<string, IntegrityIssue[]>);

    return (
        <div className="animate-fade">
            {/* Header */}
            <div className="sales-card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                            {getIcon("check-shield")} فحص سلامة الهيكل التنظيمي (Consistency Check)
                        </h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "4px 0 0" }}>
                            فحص شامل للتعيينات والسمات والعلاقات بما يحاكي SAP Consistency Log &amp; SCDO.
                        </p>
                    </div>
                    <Button variant="primary" onClick={runScan} disabled={isScanning}>
                        {isScanning ? "جاري الفحص..." : "إعادة تشغيل الفحص"}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <SummaryCard count={summary.total} label="إجمالي النتائج" color="var(--text-primary)" icon="list" active={!filterType} onClick={() => setFilterType("")} />
                <SummaryCard count={summary.errors} label="أخطاء (Blockers)" color="var(--danger)" icon="exclamation-circle" active={filterType === "ERROR"} onClick={() => setFilterType(filterType === "ERROR" ? "" : "ERROR")} />
                <SummaryCard count={summary.warnings} label="تحذيرات" color="#f59e0b" icon="warning" active={filterType === "WARNING"} onClick={() => setFilterType(filterType === "WARNING" ? "" : "WARNING")} />
                <SummaryCard count={summary.info} label="تنبيهات" color="var(--primary)" icon="info-circle" active={filterType === "INFO"} onClick={() => setFilterType(filterType === "INFO" ? "" : "INFO")} />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <button
                        onClick={() => setFilterCategory("")}
                        style={{
                            padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border-color)",
                            background: !filterCategory ? "var(--primary)" : "transparent",
                            color: !filterCategory ? "white" : "var(--text-secondary)",
                            cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, transition: "all 0.15s"
                        }}
                    >الكل</button>
                    {categories.map(cat => {
                        const count = issues.filter(i => i.category === cat && (!filterType || i.type === filterType)).length;
                        return (
                            <button key={cat}
                                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                                style={{
                                    padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border-color)",
                                    background: filterCategory === cat ? "var(--primary)" : "transparent",
                                    color: filterCategory === cat ? "white" : "var(--text-secondary)",
                                    cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, transition: "all 0.15s"
                                }}
                            >
                                {CATEGORY_LABELS[cat] || cat} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Results */}
            {issues.length === 0 && !isScanning ? (
                <div className="sales-card" style={{ textAlign: "center", padding: "4rem" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "1rem", color: "var(--success)" }}>{getIcon("check-circle")}</div>
                    <h4 style={{ color: "var(--success)" }}>الهيكل سليم 100%</h4>
                    <p style={{ color: "var(--text-muted)" }}>لا توجد تعارضات أو سمات إجبارية مفقودة أو مخالفات في القواعد المعرّفة حالياً.</p>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
                        <CheckItem label="السمات الإجبارية" icon="check" />
                        <CheckItem label="الارتباطات الأساسية" icon="check" />
                        <CheckItem label="قواعد التعدد" icon="check" />
                        <CheckItem label="صلاحية الروابط" icon="check" />
                        <CheckItem label="الوحدات المعزولة" icon="check" />
                    </div>
                </div>
            ) : isScanning ? (
                <div className="sales-card" style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
                    <p style={{ color: "var(--text-muted)" }}>جاري فحص الوحدات التنظيمية والارتباطات والقواعد...</p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "1rem" }}>
                    {Object.entries(groupedByCategory).map(([category, categoryIssues]) => (
                        <div key={category} className="sales-card">
                            <h4 style={{ margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                                    {categoryIssues.length}
                                </span>
                                {CATEGORY_LABELS[category] || category}
                            </h4>
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                {categoryIssues.map((issue, idx) => {
                                    const color = TYPE_COLORS[issue.type] || "var(--text-muted)";
                                    return (
                                        <div key={idx} style={{
                                            display: "flex", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px",
                                            background: "var(--bg-secondary)", borderRight: `3px solid ${color}`,
                                            transition: "all 0.15s",
                                        }}>
                                            <span style={{ color, fontSize: "1.2rem", flexShrink: 0, marginTop: "2px" }}>
                                                {getIcon(TYPE_ICONS[issue.type] || "info-circle")}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    <strong style={{ fontSize: "0.88rem" }}>{issue.message_ar || issue.message}</strong>
                                                    <span style={{
                                                        fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px",
                                                        background: color + "18", color, fontWeight: 600,
                                                    }}>{issue.type}</span>
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                                    الوحدة: <strong>{issue.node_code}</strong>
                                                    <span style={{ marginRight: "0.5rem", marginLeft: "0.5rem" }}>|</span>
                                                    النوع: <code style={{ fontSize: "0.75rem" }}>{issue.node_type}</code>
                                                    {issue.node_uuid && (
                                                        <span style={{ marginRight: "0.5rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                                            (ID: {issue.node_uuid.substring(0, 8)}...)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SummaryCard({ count, label, color, icon, active, onClick }: {
    count: number; label: string; color: string; icon: string; active: boolean; onClick: () => void;
}) {
    return (
        <div onClick={onClick} className="sales-card" style={{
            padding: "1.25rem", textAlign: "center", cursor: "pointer",
            border: active ? `2px solid ${color}` : "1px solid var(--border-color)",
            transition: "all 0.15s", opacity: active ? 1 : 0.7,
        }}>
            <div style={{ fontSize: "1.3rem", color, marginBottom: "0.25rem" }}>{getIcon(icon)}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
        </div>
    );
}

function CheckItem({ label, icon }: { label: string; icon: string }) {
    return (
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--success)" }}>
            {getIcon(icon)} {label}
        </span>
    );
}
