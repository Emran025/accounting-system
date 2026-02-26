import React from "react";
import { getIcon } from "@/lib/icons";

export interface SidebarFolderProps {
    folderKey: string;
    label: string;
    icon: string;
    color: string;
    isExpanded: boolean;
    isActiveGroup: boolean;
    sideNavCollapsed: boolean;
    onToggle: (key: string) => void;
    onFolderClick?: (key: string) => void;
    onContextMenu: (e: React.MouseEvent, path: string, type: "screen" | "folder") => void;
    title?: string;
    children?: React.ReactNode;
}

export function SidebarFolder({
    folderKey,
    label,
    icon,
    color,
    isExpanded,
    isActiveGroup,
    sideNavCollapsed,
    onToggle,
    onFolderClick,
    onContextMenu,
    title,
    children,
}: SidebarFolderProps) {
    const handleFolderClick = () => {
        if (onFolderClick) {
            onFolderClick(folderKey);
        }
    };

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(folderKey);
    };

    return (
        <div className="sidenav-folder-group">
            <div
                className={`sidenav-folder ${isExpanded ? "expanded" : ""} ${isActiveGroup ? "active-group" : ""}`}
                onClick={handleToggleClick}
                onContextMenu={(e) => onContextMenu(e, folderKey, "folder")}
                title={title || label}
            >
                {!sideNavCollapsed && (
                    <div className={`sidenav-folder-toggle-btn ${isExpanded ? "rotated" : ""}`}>
                        {getIcon("chevronLeft")}
                    </div>
                )}
                <span className="sidenav-folder-icon" style={{ color }}>
                    {getIcon(icon)}
                </span>
                {!sideNavCollapsed && (
                    <span className="sidenav-folder-label">{label}</span>
                )}

                {onFolderClick && !sideNavCollapsed && (
                    <button
                        className="sidenav-item-action"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFolderClick(folderKey);
                        }}
                        title="فتح القائمة الكاملة"
                    >
                        {getIcon("ExternalLink")}
                    </button>
                )}
            </div>

            {isExpanded && !sideNavCollapsed && children && (
                <div
                    className="sidenav-folder-children"
                    style={{ borderRight: `2px solid ${color}20` }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}
