import Link from "next/link";
import { getIcon } from "@/lib/icons";

export interface SidebarItemProps {
    href: string;
    icon: string;
    label: string;
    color?: string;
    isActive: boolean;
    isChild?: boolean;
    badgeSoon?: boolean;
    hasStar?: boolean;
    title?: string;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent, path: string, type: "screen" | "folder") => void;
    onActionClick?: (e: React.MouseEvent) => void;
    actionIcon?: React.ReactNode;
}

export function SidebarItem({
    href,
    icon,
    label,
    color,
    isActive,
    isChild = false,
    badgeSoon = false,
    hasStar = false,
    title,
    onClick,
    onContextMenu,
    onActionClick,
    actionIcon,
}: SidebarItemProps) {
    return (
        <div className="sidenav-item-wrapper">
            <Link
                href={href}
                className={`sidenav-item ${isChild ? "child" : ""} ${isActive ? "active" : ""}`}
                onClick={onClick}
                onContextMenu={(e) => onContextMenu(e, href, "screen")}
                title={title}
            >
                <span className="sidenav-item-icon" style={{ color }}>
                    {getIcon(icon)}
                </span>
                <span className="sidenav-item-label">{label}</span>
                {badgeSoon && <span className="sidenav-badge-soon">Soon</span>}
                {hasStar && !onActionClick && <span className="sidenav-item-star">★</span>}
            </Link>
            {onActionClick && (
                <button
                    className="sidenav-item-action"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onActionClick(e);
                    }}
                >
                    {actionIcon || (hasStar ? "★" : "✕")}
                </button>
            )}
        </div>
    );
}
