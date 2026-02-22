"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Button, showToast, StatsCard } from "@/components/ui";
import { getIcon } from "@/lib/icons";
import {
    FilterChip,
    EmptyState,
    CheckItem,
    IssueRow,
} from "./ui";
import { PageSubHeader } from "@/components/layout";

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
        <div className="sales-card animate-fade">
            {/* Header */}
            <PageSubHeader
                titleIcon="shield-check"
                title="فحص سلامة الهيكل التنظيمي (Consistency Check)"
                subTitle="فحص شامل للتعيينات والسمات والعلاقات بما يحاكي SAP Consistency Log &amp; SCDO."
                actions={
                    <>
                        <Button variant="primary" onClick={runScan} disabled={isScanning}>
                            {isScanning ? "جاري الفحص..." : "إعادة تشغيل الفحص"}
                        </Button>
                    </>
                }
            />

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <StatsCard
                    title="إجمالي النتائج"
                    value={summary.total}
                    icon={getIcon("list")}
                    colorClass="total"
                    onClick={() => setFilterType("")}
                />
                <StatsCard
                    title="أخطاء (Blockers)"
                    value={summary.errors}
                    icon={getIcon("alert")}
                    colorClass="alert"
                    onClick={() => setFilterType(filterType === "ERROR" ? "" : "ERROR")}
                />
                <StatsCard
                    title="تحذيرات"
                    value={summary.warnings}
                    icon={getIcon("alertTriangle")}
                    colorClass="default"
                    onClick={() => setFilterType(filterType === "WARNING" ? "" : "WARNING")}
                />
                <StatsCard
                    title="تنبيهات"
                    value={summary.info}
                    icon={getIcon("eye")}
                    colorClass="sales"
                    onClick={() => setFilterType(filterType === "INFO" ? "" : "INFO")}
                />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <FilterChip label="الكل" active={!filterCategory} onClick={() => setFilterCategory("")} />
                    {categories.map(cat => {
                        const count = issues.filter(i => i.category === cat && (!filterType || i.type === filterType)).length;
                        return (
                            <FilterChip
                                key={cat}
                                label={CATEGORY_LABELS[cat] || cat}
                                active={filterCategory === cat}
                                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                                count={count}
                            />
                        );
                    })}
                </div>
            )}

            {/* Results */}
            {issues.length === 0 && !isScanning ? (
                <EmptyState
                    icon="check-circle"
                    title="الهيكل سليم 100%"
                    description="لا توجد تعارضات أو سمات إجبارية مفقودة أو مخالفات في القواعد المعرّفة حالياً."
                    iconColor="var(--success)"
                >
                    <CheckItem label="السمات الإجبارية" />
                    <CheckItem label="الارتباطات الأساسية" />
                    <CheckItem label="قواعد التعدد" />
                    <CheckItem label="صلاحية الروابط" />
                    <CheckItem label="الوحدات المعزولة" />
                </EmptyState>
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
                                {categoryIssues.map((issue, idx) => (
                                    <IssueRow
                                        key={idx}
                                        type={issue.type}
                                        message={issue.message_ar || issue.message}
                                        meta={
                                            <>
                                                الوحدة: <strong>{issue.node_code}</strong>
                                                <span style={{ marginRight: "0.5rem", marginLeft: "0.5rem" }}>|</span>
                                                النوع: <code style={{ fontSize: "0.75rem" }}>{issue.node_type}</code>
                                                {issue.node_uuid && (
                                                    <span style={{ marginRight: "0.5rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                                        (ID: {issue.node_uuid.substring(0, 8)}...)
                                                    </span>
                                                )}
                                            </>
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
