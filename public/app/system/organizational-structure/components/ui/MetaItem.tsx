"use client";

interface MetaItemProps {
    /** Field label (small, uppercase) */
    label: string;
    /** Field value */
    value: string;
    /** Whether to allow word-break (default: true) */
    breakAll?: boolean;
}

/**
 * A compact key-value display block — label on top, value below.
 * Used inside detail panels, expanded rows, and metadata grids.
 *
 * Usage:
 * ```tsx
 * <MetaItem label="Entity" value="Organizational Unit" />
 * ```
 */
export function MetaItem({ label, value, breakAll = true }: MetaItemProps) {
    return (
        <div style={{
            padding: "0.35rem 0.5rem",
            background: "var(--bg-primary)",
            borderRadius: "6px",
        }}>
            <div style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
            }}>
                {label}
            </div>
            <div style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                marginTop: "1px",
                wordBreak: breakAll ? "break-all" : "normal",
            }}>
                {value}
            </div>
        </div>
    );
}

/* ---------- MetaGrid ---------- */
interface MetaGridProps {
    /** Array of label+value pairs */
    items: { label: string; value: string }[];
    /** Minimum width of each item (default: 180px) */
    minItemWidth?: string;
}

/**
 * A responsive grid of MetaItem components.
 *
 * Usage:
 * ```tsx
 * <MetaGrid items={[
 *   { label: "Entity", value: "Node" },
 *   { label: "ID", value: "abc-123" },
 *   { label: "Action", value: "Created" },
 * ]} />
 * ```
 */
export function MetaGrid({ items, minItemWidth = "180px" }: MetaGridProps) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
            gap: "0.5rem",
        }}>
            {items.map((item, idx) => (
                <MetaItem key={idx} label={item.label} value={item.value} />
            ))}
        </div>
    );
}
