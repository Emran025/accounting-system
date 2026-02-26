"use client";

import { getIcon } from "@/lib/icons";

interface DomainCardProps {
    /** Domain name (e.g. "Enterprise", "Financial") */
    domain: string;
    /** Arabic domain label */
    domainAr?: string;
    /** Accent color (hex) */
    color?: string;
    /** Icon name */
    icon: string;
    /** Numeric count */
    count: number;
    /** Description label below the count */
    description?: string;
    /** Maximum count for progress bar fill (default: 7) */
    maxForBar?: number;
    /** Click handler */
    onClick?: () => void;
}

/**
 * A dimension/domain card with watermark icon, dual labels, large count,
 * and an animated progress bar.
 *
 * Usage:
 * ```tsx
 * <DomainCard domain="Enterprise" domainAr="المؤسسة" color="#8b5cf6"
 *   icon="building" count={3} description="registered units" />
 * ```
 */
export function DomainCard({ domain, domainAr, color, icon, count, description, maxForBar = 7, onClick }: DomainCardProps) {
    return (
        <div
            className="sales-card"
            onClick={onClick}
            style={{
                padding: "1.25rem",
                position: "relative",
                overflow: "hidden",
                borderRight: `4px solid ${color}`,
                cursor: onClick ? "pointer" : undefined,
                transition: "all 0.15s",
            }}
        >
            {/* Watermark icon */}
            <div style={{
                position: "absolute",
                top: "-10px",
                left: "-10px",
                opacity: 0.05,
                fontSize: "4rem",
            }}>
                {getIcon(icon)}
            </div>

            {/* Header: labels + icon */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{
                        fontSize: "0.7rem",
                        color,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}>
                        {domain}
                    </div>
                    {domainAr && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {domainAr}
                        </div>
                    )}
                </div>
                <span style={{ color, fontSize: "1.3rem", opacity: 0.7 }}>{getIcon(icon)}</span>
            </div>

            {/* Value */}
            <div style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "0.5rem 0 0.25rem",
            }}>
                {count}
            </div>

            {/* Description */}
            {description && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{description}</div>
            )}

            {/* Progress bar */}
            <div style={{
                marginTop: "0.75rem",
                height: "4px",
                background: "var(--bg-secondary)",
                borderRadius: "2px",
            }}>
                <div style={{
                    height: "100%",
                    width: count > 0 ? `${Math.min(100, (count / maxForBar) * 100)}%` : "0%",
                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                    borderRadius: "2px",
                    transition: "width 0.5s ease",
                }} />
            </div>
        </div>
    );
}


export function DomainCardRow({ domainCards }: { domainCards: DomainCardProps[] }) {
    const DOMAIN_COLORS: Record<string, string> = {
        1: "#8b5cf6",
        2: "#3b82f6",
        3: "#06b6d4",
        4: "#10b981",
        5: "#f59e0b",
        6: "#ec4899",
        7: "#6366f1",
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "2rem" }}>
            {domainCards.map((domain, index) => (
                <DomainCard
                    key={domain.domain}
                    domain={domain.domain}
                    domainAr={domain.domainAr}
                    color={domain.color ?? DOMAIN_COLORS[(index % 5) + 1]}
                    icon={domain.icon}
                    count={domain.count}
                    description={domain.description}
                    maxForBar={domain.maxForBar}
                    onClick={domain.onClick}
                />
            ))}
        </div>
    );
}


