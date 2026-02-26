"use client";

import { getIcon } from "@/lib/icons";

interface QuickActionItemProps {
    /** Action label */
    label: string;
    /** Icon name */
    icon: string;
    /** Accent color */
    color: string;
    /** Click handler */
    onClick?: () => void;
    /** Optional secondary text */
    description?: string;
    /** Whether to hide the chevron arrow (default: false) */
    hideChevron?: boolean;
}

/**
 * A hoverable action row with icon, label, and navigation chevron.
 * Ideal for quick-access lists, settings menus, and SPRO-style action panels.
 *
 * Usage:
 * ```tsx
 * <QuickActionItem label="Define new org units" icon="plus" color="#3b82f6" onClick={handleAdd} />
 * ```
 */
export function QuickActionItem({ label, icon, color, onClick, description, hideChevron }: QuickActionItemProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.15s",
            }}
            onClick={onClick}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            <span style={{ color, fontSize: "1.1rem", flexShrink: 0 }}>{getIcon(icon)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{label}</span>
                {description && (
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>{description}</div>
                )}
            </div>
            {!hideChevron && (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    {getIcon("chevron-left")}
                </span>
            )}
        </div>
    );
}

/* ---------- ActionList ---------- */
interface ActionListProps {
    /** List of action items */
    items: QuickActionItemProps[];
    /** Optional title */
    title?: string;
    /** Optional gap between items (default: 0.5rem) */
    gap?: string;
}

/**
 * A container component that renders a vertical list of QuickActionItems.
 *
 * Usage:
 * ```tsx
 * <ActionList
 *   title="Quick Actions"
 *   items={[
 *     { label: "Add unit", icon: "plus", color: "#3b82f6", onClick: handleAdd },
 *     { label: "Run check", icon: "check", color: "#10b981", onClick: handleCheck },
 *   ]}
 * />
 * ```
 */
export function ActionList({ items, title, gap = "0.5rem" }: ActionListProps) {
    return (
        <div>
            {title && (
                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--text-primary)" }}>{title}</h4>
            )}
            <div style={{ display: "grid", gap }}>
                {items.map((item, idx) => (
                    <QuickActionItem key={idx} {...item} />
                ))}
            </div>
        </div>
    );
}
