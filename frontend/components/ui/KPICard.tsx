"use client";

import { getIcon, IconName } from "@/lib/icons";

interface KPICardProps {
    /** Icon name from the icon library */
    icon: IconName;
    /** Primary label text */
    label: string;
    /** Numeric value to display prominently */
    value: number;
    /** Accent color (hex) */
    color?: string;
    /** Secondary text below the value */
    subtitle?: string;
    /** Optional click handler */
    onClick?: () => void;
    /** Whether to show compact version */
    compact?: boolean;
}

/**
 * A KPI metric card with icon bubble, large value, and subtitle.
 *
 * Usage:
 * ```tsx
 * <KPICard icon="sitemap" label="Total Units" value={42} color="#3b82f6" subtitle="12 active" />
 * ```
 */
export function KPICard({ icon, label, value, color, subtitle, onClick, compact }: KPICardProps) {
    return (
        <div
            className="sales-card"
            onClick={onClick}
            style={{
                padding: compact ? "1rem" : "1.25rem",
                position: "relative",
                overflow: "hidden",
                cursor: onClick ? "pointer" : undefined,
                transition: "all 0.15s",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
                    <div style={{
                        fontSize: compact ? "1.5rem" : "2rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        margin: "0.25rem 0",
                    }}>
                        {value}
                    </div>
                    {subtitle && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{subtitle}</div>
                    )}
                </div>
                <div style={{
                    width: compact ? "36px" : "44px",
                    height: compact ? "36px" : "44px",
                    borderRadius: "12px",
                    background: color + "15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: compact ? "1.1rem" : "1.3rem",
                    color,
                }}>
                    {getIcon(icon)}
                </div>
            </div>
        </div>
    );
}


export function KPICardRow({ KPICards }: { KPICards: KPICardProps[] }) {

    const KPI_COLORS: Record<number, string> = {
        0: "#3b82f6",
        1: "#10b981",
        2: "#8b5cf6",
        3: "#f59e0b",
        4: "#10b981",
        5: "#06b6d4"
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {KPICards.map((card, index) => (
                <KPICard
                    key={card.label}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    color={card.color ?? KPI_COLORS[(index % 6) + 1]}
                    subtitle={card.subtitle}
                    onClick={card.onClick}
                    compact={card.compact}
                />
            ))}
        </div>
    );
}
