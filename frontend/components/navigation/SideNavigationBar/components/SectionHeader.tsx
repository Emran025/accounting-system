import { useRef } from "react";
import { getIcon } from "@/lib/icons";

export interface SectionHeaderProps {
    title: string;
    icon: string;
    collapsed: boolean;
    onToggle: () => void;
    count?: number;
    actions?: React.ReactNode;
    /** Section content rendered below the header */
    children?: React.ReactNode;
    /** Height of the section when expanded (px). Enables the resizable wrapper. */
    sectionHeight?: number;
    /** Called when drag starts on the header for VS Code-style resize */
    onResizeStart?: (e: React.MouseEvent) => void;
    /** Whether the header is currently being dragged */
    isResizing?: boolean;
    /** Whether this is the last expanded section in the sidebar (gets flex: 1) */
    isLastExpanded?: boolean;
}

export function SectionHeader({
    title,
    icon,
    collapsed,
    onToggle,
    count,
    actions,
    children,
    sectionHeight,
    onResizeStart,
    isResizing,
    isLastExpanded,
}: SectionHeaderProps) {
    const dragRef = useRef<{ startY: number; moved: boolean } | null>(null);

    /**
     * VS Code-style: mousedown records the start position.
     * If the user drags beyond a threshold, we start resizing.
     * If they release without moving, it's a click (toggle).
     */
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (!onResizeStart) return;

        e.preventDefault();
        dragRef.current = { startY: e.clientY, moved: false };

        const handleMouseMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const diff = Math.abs(ev.clientY - dragRef.current.startY);
            if (diff > 3 && !dragRef.current.moved) {
                dragRef.current.moved = true;
                // Trigger the resize start from the original event position
                onResizeStart(e);
            }
        };

        const handleMouseUp = () => {
            if (dragRef.current && !dragRef.current.moved) {
                // No drag occurred — treat as a click (toggle)
                onToggle();
            }
            dragRef.current = null;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const headerContent = (
        <div
            className={`sidenav-section-header-wrapper ${onResizeStart ? "resizable" : ""} ${isResizing ? "resizing" : ""}`}
            onMouseDown={handleMouseDown}
        >
            <button
                className="sidenav-section-header"
                onClick={(e) => {
                    // When resizable, clicks are handled via mousedown/mouseup flow
                    if (onResizeStart) {
                        e.preventDefault();
                        return;
                    }
                    onToggle();
                }}
            >
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

    // If sectionHeight is provided, wrap in resizable container
    if (sectionHeight !== undefined) {
        let style: React.CSSProperties = { minHeight: '32px' };
        if (collapsed) {
            style.height = 'auto';
            style.flexShrink = 0;
        } else if (isLastExpanded) {
            style.flex = 1;
            style.height = 'auto';
        } else {
            style.height = `${sectionHeight}px`;
            style.flexShrink = 0;
        }

        return (
            <div className="sidenav-resizable-section" style={style}>
                {headerContent}
                {!collapsed && children}
            </div>
        );
    }

    // Fallback: no resizable wrapper
    return (
        <>
            {headerContent}
            {!collapsed && children}
        </>
    );
}
