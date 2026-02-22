"use client";

import { getIcon } from "@/lib/icons";

/* ---------- StatusItem ---------- */
interface StatusItemProps {
    /** Label text */
    label: string;
    /** Whether the status is active/positive */
    active: boolean;
    /** Icon for active state (default: "check-circle") */
    activeIcon?: string;
    /** Icon for inactive state (default: "circle-o") */
    inactiveIcon?: string;
}

/**
 * A checklist-style row showing a label and active/inactive indicator.
 *
 * Usage:
 * ```tsx
 * <StatusItem label="Company Codes defined" active={true} />
 * ```
 */
export function StatusItem({ label, active, activeIcon = "check-circle", inactiveIcon = "circle-o" }: StatusItemProps) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem",
            background: "var(--bg-secondary)",
            borderRadius: "6px",
        }}>
            <span style={{ fontSize: "0.9rem" }}>{label}</span>
            <span style={{ color: active ? "var(--success)" : "var(--text-muted)", fontSize: "1.2rem" }}>
                {getIcon(active ? activeIcon : inactiveIcon)}
            </span>
        </div>
    );
}

/* ---------- StatusBar ---------- */
interface StatusBarProps {
    /** Bar label */
    label: string;
    /** Current count */
    count: number;
    /** Total count for percentage calculation */
    total: number;
    /** Bar color */
    color: string;
    /** Whether to show percentage (default: true) */
    showPercentage?: boolean;
}

/**
 * A horizontal progress bar with label, count, and percentage.
 *
 * Usage:
 * ```tsx
 * <StatusBar label="Active" count={15} total={20} color="#10b981" />
 * ```
 */
export function StatusBar({ label, count, total, color, showPercentage = true }: StatusBarProps) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>
                    {count}{showPercentage ? ` (${pct}%)` : ""}
                </span>
            </div>
            <div style={{ height: "6px", background: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: color,
                    borderRadius: "3px",
                    transition: "width 0.4s ease",
                }} />
            </div>
        </div>
    );
}

/* ---------- CheckItem ---------- */
interface CheckItemProps {
    /** Label text */
    label: string;
    /** Icon name (default: "check") */
    icon?: string;
    /** Color (default: "var(--success)") */
    color?: string;
}

/**
 * An inline check badge used to indicate a passed check.
 *
 * Usage:
 * ```tsx
 * <CheckItem label="Mandatory Attributes" />
 * ```
 */
export function CheckItem({ label, icon = "check", color = "var(--success)" }: CheckItemProps) {
    return (
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color }}>
            {getIcon(icon)} {label}
        </span>
    );
}
