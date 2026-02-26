import { getIcon } from "@/lib/icons";

export interface SectionHeaderProps {
    title: string;
    icon: string;
    collapsed: boolean;
    onToggle: () => void;
    count?: number;
    actions?: React.ReactNode;
}

export function SectionHeader({
    title,
    icon,
    collapsed,
    onToggle,
    count,
    actions,
}: SectionHeaderProps) {
    return (
        <div className="sidenav-section-header-wrapper">
            <button className="sidenav-section-header" onClick={onToggle}>
                <span className={`sidenav-section-chevron ${collapsed ? "" : "rotated"}`}>
                    {getIcon("chevronLeft")}
                </span>
                <span className="sidenav-section-header-icon">{getIcon(icon)}</span>
                <span className="sidenav-section-header-title">{title}</span>
                {count !== undefined && count > 0 && (
                    <span className="sidenav-section-count">{count}</span>
                )}
            </button>
            {actions && <div className="sidenav-section-actions">{actions}</div>}
        </div>
    );
}
