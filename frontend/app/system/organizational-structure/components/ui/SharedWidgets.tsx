"use client";

import { getIcon } from "@/lib/icons";
import { ReactNode } from "react";

interface DomainBadgeProps {
    /** Domain name (Enterprise, Financial, etc.) */
    domain: string;
    /** Accent color */
    color: string;
    /** Node type label */
    typeLabel: string;
}

/**
 * A small colored badge for displaying node type + domain.
 *
 * Usage:
 * ```tsx
 * <DomainBadge domain="Financial" color="#3b82f6" typeLabel="Company Code" />
 * ```
 */
export function DomainBadge({ color, typeLabel }: DomainBadgeProps) {
    return (
        <span style={{
            padding: "2px 8px",
            borderRadius: "4px",
            background: color + "20",
            color,
            fontSize: "0.8rem",
            fontWeight: 600,
        }}>
            {typeLabel}
        </span>
    );
}

/* ---------- EmptyState ---------- */
interface EmptyStateProps {
    /** Large icon name */
    icon: string;
    /** Primary message */
    title: string;
    /** Secondary description */
    description?: string;
    /** Optional action content (e.g. checks, buttons) */
    children?: ReactNode;
    /** Icon color (default: "var(--success)") */
    iconColor?: string;
}

/**
 * A centered empty/success state display.
 *
 * Usage:
 * ```tsx
 * <EmptyState icon="check-circle" title="All checks passed!" iconColor="var(--success)">
 *   <CheckItem label="Mandatory attributes" />
 * </EmptyState>
 * ```
 */
export function EmptyState({ icon, title, description, children, iconColor = "var(--text-muted)" }: EmptyStateProps) {
    return (
        <div className="sales-card" style={{ textAlign: "center", padding: "4rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem", color: iconColor }}>{getIcon(icon)}</div>
            <h4 style={{ color: iconColor }}>{title}</h4>
            {description && (
                <p style={{ color: "var(--text-muted)" }}>{description}</p>
            )}
            {children && (
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
                    {children}
                </div>
            )}
        </div>
    );
}

/* ---------- FilterChip ---------- */
interface FilterChipProps {
    /** Chip label */
    label: string;
    /** Whether the chip is active */
    active: boolean;
    /** Click handler */
    onClick: () => void;
    /** Optional count to display */
    count?: number;
}

/**
 * A pill-shaped filter toggle chip.
 *
 * Usage:
 * ```tsx
 * <FilterChip label="Orphans" active={filter === "orphan"} onClick={() => toggle("orphan")} count={3} />
 * ```
 */
export function FilterChip({ label, active, onClick, count }: FilterChipProps) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "4px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                transition: "all 0.15s",
            }}
        >
            {label}{count !== undefined ? ` (${count})` : ""}
        </button>
    );
}

/* ---------- IssueRow ---------- */
interface IssueRowProps {
    /** Severity type */
    type: "ERROR" | "WARNING" | "INFO";
    /** Primary message */
    message: string;
    /** Optional metadata displayed below the message */
    meta?: ReactNode;
    /** Custom color override (auto-resolved from type if not provided) */
    color?: string;
    /** Custom icon override */
    icon?: string;
}

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

/**
 * A severity-colored issue/alert row with border accent, icon, and type badge.
 *
 * Usage:
 * ```tsx
 * <IssueRow type="ERROR" message="Missing company code"
 *   meta={<span>Node: <strong>PLANT01</strong></span>} />
 * ```
 */
export function IssueRow({ type, message, meta, color: customColor, icon: customIcon }: IssueRowProps) {
    const color = customColor || TYPE_COLORS[type] || "var(--text-muted)";
    const icon = customIcon || TYPE_ICONS[type] || "info-circle";

    return (
        <div style={{
            display: "flex",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "var(--bg-secondary)",
            borderRight: `3px solid ${color}`,
            transition: "all 0.15s",
        }}>
            <span style={{ color, fontSize: "1.2rem", flexShrink: 0, marginTop: "2px" }}>
                {getIcon(icon)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.88rem" }}>{message}</strong>
                    <span style={{
                        fontSize: "0.65rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: color + "18",
                        color,
                        fontWeight: 600,
                    }}>
                        {type}
                    </span>
                </div>
                {meta && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {meta}
                    </div>
                )}
            </div>
        </div>
    );
}
