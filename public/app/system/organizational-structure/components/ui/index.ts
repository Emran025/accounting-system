/**
 * Organizational Structure — Reusable UI Components
 *
 * A curated set of presentational primitives extracted from the
 * org-structure module. Import from this barrel file:
 *
 *   import { KPICard, SummaryCard, StatusBar, QuickActionItem } from "./ui";
 */

export const DOMAIN_COLORS: Record<string, string> = {
    Enterprise: "#8b5cf6", Financial: "#3b82f6", Controlling: "#06b6d4",
    Logistics: "#10b981", Sales: "#f59e0b", HR: "#ec4899", Project: "#6366f1",
};

export const DOMAIN_ICONS: Record<string, string> = {
    Enterprise: "building",
    Financial: "dollar",
    Controlling: "calculator",
    Logistics: "box",
    Sales: "cart",
    HR: "users",
    Project: "clipboard-list",
};

// Status & Progress
export { StatusItem, StatusBar, CheckItem } from "./StatusWidgets";

// Action Lists
export { QuickActionItem, ActionList } from "./ActionList";

// Metadata Display
export { MetaItem, MetaGrid } from "./MetaItem";


// Shared Widgets
export { DomainBadge, EmptyState, FilterChip, IssueRow } from "./SharedWidgets";
