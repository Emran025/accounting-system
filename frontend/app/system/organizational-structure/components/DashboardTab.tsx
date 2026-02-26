"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import {
    StatusItem,
    StatusBar,
    QuickActionItem,
    DOMAIN_ICONS,
} from "./ui";
import { DomainCardRow, KPICardRow } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";

interface Statistics {
    total_nodes: number;
    active_nodes: number;
    inactive_nodes: number;
    archived_nodes: number;
    total_links: number;
    active_links: number;
    total_rules: number;
    total_meta_types: number;
    domain_breakdown: Record<string, number>;
    type_breakdown: Record<string, number>;
    orphan_count: number;
    recent_changes_7d: number;
}

const DOMAIN_LABELS_AR: Record<string, string> = {
    Enterprise: "المؤسسة",
    Financial: "المالية",
    Controlling: "التحكم",
    Logistics: "اللوجستيات",
    Sales: "المبيعات",
    HR: "الموارد البشرية",
    Project: "المشاريع",
};

export function DashboardTab() {
    const [stats, setStats] = useState<Statistics | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetchAPI(API_ENDPOINTS.SYSTEM.ORG_STRUCTURE.STATISTICS);
            if (res.statistics) {
                setStats(res.statistics as Statistics);
            }
        } catch { /* silently fail — fallback below */ }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadStats(); }, [loadStats]);

    if (isLoading) {
        return <div className="loading-spinner" style={{ margin: "2rem auto" }} />;
    }

    const domains = ["Enterprise", "Financial", "Controlling", "Logistics", "Sales", "HR", "Project"];

    return (
        <div className="animate-fade">
            <PageSubHeader
                titleIcon="dashboard"
                title="نظرة عامة على الهيكل التنظيمي (SAP Enterprise Structure)"
                subTitle="تغطية شاملة لأبعاد النظام الأساسية بما يحاكي تجربة SAP SPRO."
            />

            {/* KPI Cards Row */}
            <KPICardRow
                KPICards={[
                    { icon: "sitemap", label: "إجمالي الوحدات", value: stats?.total_nodes ?? 0, subtitle: `${stats?.active_nodes ?? 0} نشط` },
                    { icon: "link", label: "الارتباطات", value: stats?.total_links ?? 0, subtitle: `${stats?.active_links ?? 0} نشط` },
                    { icon: "route", label: "قواعد التوبولوجيا", value: stats?.total_rules ?? 0, subtitle: "قاعدة ارتباط فعّالة" },
                    { icon: "box", label: "أنواع الوحدات", value: stats?.total_meta_types ?? 0, subtitle: "نوع معرّف في النظام" },
                    { icon: "alertTriangle", label: "وحدات معزولة", value: stats?.orphan_count ?? 0, color: stats?.orphan_count ? "#ef4444" : "#10b981", subtitle: "بدون أي ارتباط" },
                    { icon: "history", label: "تغييرات الأسبوع", value: stats?.recent_changes_7d ?? 0, subtitle: "خلال 7 أيام" },
                ]}
            />


            {/* Dimension Grid */}
            <h4 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>{getIcon("tree")} أبعاد الهيكل التنظيمي (Module Dimensions)</h4>
            <DomainCardRow
                domainCards={domains.map((domain) => ({
                    key: domain,
                    domain: domain,
                    domainAr: DOMAIN_LABELS_AR[domain],
                    icon: DOMAIN_ICONS[domain] || "cube",
                    count: stats?.domain_breakdown?.[domain] ?? 0,
                    description: "وحدات تنظيمية مسجلة"
                }))}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* Health Status */}
                <div className="sales-card">
                    <h4 style={{ margin: "0 0 1rem" }}>{getIcon("check-circle")} حالة سلامة الهيكل الأساسي</h4>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                        <StatusItem label="تعريف العميل (Client Setup)" active={(stats?.domain_breakdown?.Enterprise ?? 0) > 0} />
                        <StatusItem label="رموز الشركات (Company Codes)" active={(stats?.domain_breakdown?.Financial ?? 0) > 0} />
                        <StatusItem label="مناطق التحكم والتكلفة (Controlling)" active={(stats?.domain_breakdown?.Controlling ?? 0) > 0} />
                        <StatusItem label="المصانع والمواقع (Logistics/Plants)" active={(stats?.domain_breakdown?.Logistics ?? 0) > 0} />
                        <StatusItem label="منظمات المبيعات (Sales Orgs)" active={(stats?.domain_breakdown?.Sales ?? 0) > 0} />
                        <StatusItem label="شؤون الموظفين (HR Personnel Areas)" active={(stats?.domain_breakdown?.HR ?? 0) > 0} />
                        <StatusItem label="هيكل المشاريع (Project Systems)" active={(stats?.domain_breakdown?.Project ?? 0) > 0} />
                    </div>
                </div>

                {/* Node Status Breakdown + SPRO Quick Actions */}
                <div className="sales-card">
                    <h4 style={{ margin: "0 0 1rem" }}>{getIcon("settings")} تخصيص النظام (SPRO Style)</h4>

                    {/* Status bars */}
                    <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
                        <StatusBar label="نشط (Active)" count={stats?.active_nodes ?? 0} total={stats?.total_nodes || 1} color="#10b981" />
                        <StatusBar label="غير نشط (Inactive)" count={stats?.inactive_nodes ?? 0} total={stats?.total_nodes || 1} color="#f59e0b" />
                        <StatusBar label="مؤرشف (Archived)" count={stats?.archived_nodes ?? 0} total={stats?.total_nodes || 1} color="#6b7280" />
                    </div>

                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                        وصول سريع لإعدادات البنية التحتية للمؤسسة
                    </p>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <QuickActionItem label="تعريف الوحدات التنظيمية الجديدة" icon="plus" color="#3b82f6" />
                        <QuickActionItem label="إدارة قواعد التوبولوجيا والارتباط" icon="route" color="#8b5cf6" />
                        <QuickActionItem label="مراجعة روابط المحاسبة المالية" icon="dollar" color="#10b981" />
                        <QuickActionItem label="توزيع مواقع التخزين والشحن" icon="truck" color="#f59e0b" />
                        <QuickActionItem label="فحص سلامة الهيكل (Consistency)" icon="check-shield" color="#ef4444" />
                    </div>
                </div>
            </div>

            {/* Type Breakdown Table */}
            {stats?.type_breakdown && Object.keys(stats.type_breakdown).length > 0 && (
                <div className="sales-card" style={{ marginTop: "1.5rem" }}>
                    <h4 style={{ margin: "0 0 1rem" }}>{getIcon("chart-bar")} توزيع الوحدات حسب النوع</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
                        {Object.entries(stats.type_breakdown).sort(([, a], [, b]) => b - a).map(([typeId, count]) => (
                            <div key={typeId} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "0.5rem 0.75rem", background: "var(--bg-secondary)", borderRadius: "6px"
                            }}>
                                <code style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{typeId}</code>
                                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
