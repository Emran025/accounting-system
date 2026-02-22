"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

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

const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6",
    Financial: "#3b82f6",
    Controlling: "#06b6d4",
    Logistics: "#10b981",
    Sales: "#f59e0b",
    HR: "#ec4899",
    Project: "#6366f1",
};

const DOMAIN_ICONS: Record<string, string> = {
    Enterprise: "building",
    Financial: "dollar",
    Controlling: "chart-line",
    Logistics: "box",
    Sales: "cart",
    HR: "users",
    Project: "clipboard",
};

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
            <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>{getIcon("dashboard")} نظرة عامة على الهيكل التنظيمي (SAP Enterprise Structure)</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                    تغطية شاملة لأبعاد النظام الأساسية بما يحاكي تجربة SAP SPRO.
                </p>
            </div>

            {/* KPI Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <KPICard icon="sitemap" label="إجمالي الوحدات" value={stats?.total_nodes ?? 0} color="#3b82f6" subtitle={`${stats?.active_nodes ?? 0} نشط`} />
                <KPICard icon="link" label="الارتباطات" value={stats?.total_links ?? 0} color="#10b981" subtitle={`${stats?.active_links ?? 0} نشط`} />
                <KPICard icon="route" label="قواعد التوبولوجيا" value={stats?.total_rules ?? 0} color="#8b5cf6" subtitle="قاعدة ارتباط فعّالة" />
                <KPICard icon="cube" label="أنواع الوحدات" value={stats?.total_meta_types ?? 0} color="#f59e0b" subtitle="نوع معرّف في النظام" />
                <KPICard icon="warning" label="وحدات معزولة" value={stats?.orphan_count ?? 0} color={stats?.orphan_count ? "#ef4444" : "#10b981"} subtitle="بدون أي ارتباط" />
                <KPICard icon="history" label="تغييرات الأسبوع" value={stats?.recent_changes_7d ?? 0} color="#06b6d4" subtitle="خلال 7 أيام" />
            </div>

            {/* Dimension Grid */}
            <h4 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>{getIcon("tree")} أبعاد الهيكل التنظيمي (Module Dimensions)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {domains.map((domain) => {
                    const count = stats?.domain_breakdown?.[domain] ?? 0;
                    const color = DOMAIN_COLORS[domain] || "#6b7280";
                    return (
                        <div key={domain} className="sales-card" style={{ padding: "1.25rem", position: "relative", overflow: "hidden", borderRight: `4px solid ${color}` }}>
                            <div style={{ position: "absolute", top: "-10px", left: "-10px", opacity: 0.05, fontSize: "4rem" }}>
                                {getIcon(DOMAIN_ICONS[domain] || "cube")}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontSize: "0.7rem", color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{domain}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>{DOMAIN_LABELS_AR[domain]}</div>
                                </div>
                                <span style={{ color, fontSize: "1.3rem", opacity: 0.7 }}>{getIcon(DOMAIN_ICONS[domain] || "cube")}</span>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "0.5rem 0 0.25rem" }}>{count}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>وحدات تنظيمية مسجلة</div>
                            <div style={{ marginTop: "0.75rem", height: "4px", background: "var(--bg-secondary)", borderRadius: "2px" }}>
                                <div style={{
                                    height: "100%",
                                    width: count > 0 ? `${Math.min(100, count * 15)}%` : "0%",
                                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                                    borderRadius: "2px",
                                    transition: "width 0.5s ease",
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

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
                        <QuickLink label="تعريف الوحدات التنظيمية الجديدة" icon="plus" color="#3b82f6" />
                        <QuickLink label="إدارة قواعد التوبولوجيا والارتباط" icon="route" color="#8b5cf6" />
                        <QuickLink label="مراجعة روابط المحاسبة المالية" icon="dollar" color="#10b981" />
                        <QuickLink label="توزيع مواقع التخزين والشحن" icon="truck" color="#f59e0b" />
                        <QuickLink label="فحص سلامة الهيكل (Consistency)" icon="check-shield" color="#ef4444" />
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

function KPICard({ icon, label, value, color, subtitle }: { icon: string; label: string; value: number; color: string; subtitle: string }) {
    return (
        <div className="sales-card" style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "0.25rem 0" }}>{value}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{subtitle}</div>
                </div>
                <div style={{
                    width: "44px", height: "44px", borderRadius: "12px",
                    background: color + "15", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem", color
                }}>
                    {getIcon(icon)}
                </div>
            </div>
        </div>
    );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <span style={{ fontSize: "0.9rem" }}>{label}</span>
            <span style={{ color: active ? "var(--success)" : "var(--text-muted)", fontSize: "1.2rem" }}>
                {getIcon(active ? "check-circle" : "circle-o")}
            </span>
        </div>
    );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = Math.round((count / total) * 100);
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height: "6px", background: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
}

function QuickLink({ label, icon, color }: { label: string; icon: string; color: string }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.75rem",
            borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer",
            transition: "all 0.15s"
        }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            <span style={{ color, fontSize: "1.1rem" }}>{getIcon(icon)}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{label}</span>
            <span style={{ marginRight: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>{getIcon("chevron-left")}</span>
        </div>
    );
}
