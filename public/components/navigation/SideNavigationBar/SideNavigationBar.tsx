"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigationGroups, NavigationGroup, NavigationLink } from "@/lib/navigation-config";
import { canAccess } from "@/lib/auth";
import { useUIStore } from "@/stores/useUIStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { SectionHeader } from "./components/SectionHeader";
import { ContextMenuPortal } from "./components/ContextMenuPortal";
import { SidebarItem } from "./components/SidebarItem";
import { SidebarFolder } from "./components/SidebarFolder";
import { getIcon } from "@/lib/icons";

/* ─────────────────────── Module Color Palette ─────────────────────── */
const MODULE_COLORS: Record<string, string> = {
    dashboard: "#3b82f6",
    sales: "#10b981",
    purchases: "#10b981",
    inventory: "#06b6d4",
    finance: "#f59e0b",
    hr: "#8b5cf6",
    manufacturing: "#64748b",
    projects: "#8b5cf6",
};

function getModuleColor(key: string): string {
    return MODULE_COLORS[key] || "#3b82f6";
}

/* ─────────────────── SideNavigationBar Component ──────────────────── */
interface SideNavigationBarProps {
    onCollapsedChange?: (collapsed: boolean) => void;
}

export function SideNavigationBar({ onCollapsedChange }: SideNavigationBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { permissions } = useAuthStore();

    const {
        sideNavCollapsed,
        setSideNavCollapsed,
        sideNavWidth,
        setSideNavWidth,
        openedSectionCollapsed,
        systemMenuSectionCollapsed,
        favoritesSectionCollapsed,
        toggleSection,
        recentScreens,
        addRecentScreen,
        favoriteScreens,
        addFavorite,
        removeFavorite,
        autoCollapseOnNavigate,
        expandedFolders,
        toggleFolder,
        setExpandedFolders,
        removeRecentScreen,
    } = useUIStore();

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isDesktop, setIsDesktop] = useState(true);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        path: string;
        type: "screen" | "folder";
    } | null>(null);
    const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    // Track current screen in recent
    useEffect(() => {
        if (pathname && pathname !== "/") {
            addRecentScreen(pathname);
        }
    }, [pathname, addRecentScreen]);

    // Sync collapsed state with body class and callback
    useEffect(() => {
        onCollapsedChange?.(sideNavCollapsed);
        if (sideNavCollapsed) {
            document.body.classList.add("sidenav-collapsed");
        } else {
            document.body.classList.remove("sidenav-collapsed");
        }
    }, [sideNavCollapsed, onCollapsedChange]);

    // Mobile responsive handler
    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth > 1024;
            setIsDesktop(desktop);
            if (desktop) {
                setIsMobileOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Close context menu on click outside
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [contextMenu]);

    /* ── Resize handler ── */
    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            resizeRef.current = { startX: e.clientX, startWidth: sideNavWidth };

            const handleMouseMove = (ev: MouseEvent) => {
                if (!resizeRef.current) return;
                // RTL: dragging left increases width
                const diff = resizeRef.current.startX - ev.clientX;
                setSideNavWidth(resizeRef.current.startWidth + diff);
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                resizeRef.current = null;
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        },
        [sideNavWidth, setSideNavWidth]
    );

    /* ── Toggle ── */
    const handleToggle = () => {
        if (!isDesktop) {
            setIsMobileOpen(!isMobileOpen);
        } else {
            setSideNavCollapsed(!sideNavCollapsed);
        }
    };

    /* ── Navigation handler ── */
    const handleScreenClick = (href: string) => {
        addRecentScreen(href);
        setIsMobileOpen(false);
        if (autoCollapseOnNavigate && isDesktop) {
            setSideNavCollapsed(true);
        }
    };

    /* ── Folder click handler (opens card view) ── */
    const handleFolderClick = (folderKey: string) => {
        router.push(`/navigation?group=${folderKey}`);
        setIsMobileOpen(false);
    };

    /* ── Context Menu ── */
    const handleContextMenu = (
        e: React.MouseEvent,
        path: string,
        type: "screen" | "folder"
    ) => {
        // Folders do not have context menu options currently
        if (type === "folder") return;

        e.preventDefault();

        // Calculate safe coordinates to prevent off-screen rendering
        const menuWidth = 220;
        const menuHeight = 110;

        let x = e.clientX;
        let y = e.clientY;

        // Prevent overflow on the right edge
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8;
        }

        // Prevent overflow on the bottom edge
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8;
        }

        setContextMenu({ x, y, path, type });
    };

    /* ── Get all accessible links flat ── */
    const getAllLinks = useCallback((): NavigationLink[] => {
        return navigationGroups.flatMap((g) =>
            g.links.filter((l) => canAccess(permissions, l.module, "view"))
        );
    }, [permissions]);

    /* ── Find link by path ── */
    const findLink = useCallback(
        (path: string): NavigationLink | undefined => {
            return getAllLinks().find((l) => l.href === path);
        },
        [getAllLinks]
    );

    /* ── Computed sidebar width style ── */
    const sidebarWidth = sideNavCollapsed ? 64 : sideNavWidth;
    const sidebarStyle = {
        width: `${sidebarWidth}px`,
        minWidth: sideNavCollapsed ? "64px" : "200px",
    };

    /* ════════════════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════════════════ */
    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sidenav-overlay ${isMobileOpen ? "active" : ""}`}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* ── Main Sidebar ── */}
            <aside
                ref={sidebarRef}
                className={`side-navigation-bar ${sideNavCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-visible" : ""} ${isResizing ? "resizing" : ""}`}
                style={isDesktop ? sidebarStyle : undefined}
            >
                {/* Scrollable sections */}
                <div className="sidenav-sections">
                    {/* ═══ Section 1: Opened (Recently Accessed) ═══ */}
                    {!sideNavCollapsed && (
                        <SectionHeader
                            title="الحديثة"
                            icon="clock"
                            collapsed={openedSectionCollapsed}
                            onToggle={() => toggleSection("opened")}
                            count={recentScreens.length}
                        />
                    )}
                    {!sideNavCollapsed && !openedSectionCollapsed && (
                        <div className="sidenav-section-content">
                            {recentScreens.length === 0 ? (
                                <div className="sidenav-empty">No recent screens</div>
                            ) : (
                                recentScreens.map((path) => {
                                    const link = findLink(path);
                                    if (!link) return null;
                                    const group = navigationGroups.find((g) =>
                                        g.links.some((l) => l.href === path)
                                    );
                                    return (
                                        <SidebarItem
                                            key={`recent-${path}`}
                                            href={link.href}
                                            icon={link.icon}
                                            label={link.label}
                                            color={getModuleColor(group?.key || "")}
                                            isActive={pathname === link.href}
                                            onClick={() => handleScreenClick(link.href)}
                                            onContextMenu={handleContextMenu}
                                            onActionClick={() => removeRecentScreen(path)}
                                            actionIcon={<i className="fa-solid fa-xmark"></i>}
                                        />
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ═══ Section 2: System Menu (Full Tree) ═══ */}
                    {!sideNavCollapsed && (
                        <SectionHeader
                            title="القائمة الأساسية"
                            icon="sitemap"
                            collapsed={systemMenuSectionCollapsed}
                            onToggle={() => toggleSection("systemMenu")}
                        />
                    )}
                    {!systemMenuSectionCollapsed && (
                        <div className={`sidenav-section-content ${sideNavCollapsed ? "collapsed-mode" : ""}`}>
                            {navigationGroups.map((group) => {
                                const accessibleLinks = group.links.filter((l) =>
                                    canAccess(permissions, l.module, "view")
                                );
                                if (accessibleLinks.length === 0) return null;

                                const isExpanded = expandedFolders.includes(group.key);
                                const isActiveGroup = accessibleLinks.some((l) => pathname === l.href);
                                const color = getModuleColor(group.key);

                                return (
                                    <SidebarFolder
                                        key={group.key}
                                        folderKey={group.key}
                                        label={group.label}
                                        icon={group.icon}
                                        color={color}
                                        isExpanded={isExpanded}
                                        isActiveGroup={isActiveGroup}
                                        sideNavCollapsed={sideNavCollapsed}
                                        onToggle={toggleFolder}
                                        onFolderClick={handleFolderClick}
                                        onContextMenu={handleContextMenu}
                                        title={group.label}
                                    >
                                        {accessibleLinks.map((link) => (
                                            <SidebarItem
                                                key={link.href + link.label}
                                                href={link.href}
                                                icon={link.icon}
                                                label={link.label}
                                                color={color}
                                                isActive={pathname === link.href}
                                                isChild={true}
                                                badgeSoon={link.description.includes("قريباً")}
                                                title={link.description}
                                                onClick={() => handleScreenClick(link.href)}
                                                onContextMenu={handleContextMenu}
                                            />
                                        ))}
                                    </SidebarFolder>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ Section 3: Favorites ═══ */}
                    {(() => {
                        // Compute resolvable favorites only
                        const resolvedFavorites = favoriteScreens
                            .map((path) => {
                                const link = findLink(path);
                                if (!link) return null;
                                const group = navigationGroups.find((g) =>
                                    g.links.some((l) => l.href === path)
                                );
                                return { path, link, group };
                            })
                            .filter(Boolean) as { path: string; link: NavigationLink; group: NavigationGroup | undefined }[];

                        return (
                            <>
                                {!sideNavCollapsed && (
                                    <SectionHeader
                                        title="المفضلة"
                                        icon="star"
                                        collapsed={favoritesSectionCollapsed}
                                        onToggle={() => toggleSection("favorites")}
                                        count={resolvedFavorites.length}
                                    />
                                )}
                                {!sideNavCollapsed && !favoritesSectionCollapsed && (
                                    <div className="sidenav-section-content">
                                        {resolvedFavorites.length === 0 ? (
                                            <div className="sidenav-empty">
                                                Right-click any screen to add it to favorites
                                            </div>
                                        ) : (
                                            resolvedFavorites.map(({ path, link, group }) => (
                                                <SidebarItem
                                                    key={`fav-${path}`}
                                                    href={link.href}
                                                    icon={link.icon}
                                                    label={link.label}
                                                    color={getModuleColor(group?.key || "")}
                                                    isActive={pathname === link.href}
                                                    hasStar={true}
                                                    onClick={() => handleScreenClick(link.href)}
                                                    onContextMenu={handleContextMenu}
                                                    onActionClick={() => removeFavorite(path)}
                                                    actionIcon={<i className="fa-solid fa-star"></i>}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                {/* Resize handle (desktop only, non-collapsed) */}
                {!sideNavCollapsed && (
                    <div
                        className="sidenav-resize-handle"
                        onMouseDown={handleResizeStart}
                    />
                )}
            </aside>

            {/* ── Context Menu ── */}
            {contextMenu && (
                <ContextMenuPortal
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    path={contextMenu.path}
                    isFavorite={favoriteScreens.includes(contextMenu.path)}
                    onAddFavorite={() => addFavorite(contextMenu.path)}
                    onRemoveFavorite={() => removeFavorite(contextMenu.path)}
                    onOpen={() => {
                        if (contextMenu.type === "screen") {
                            router.push(contextMenu.path);
                            handleScreenClick(contextMenu.path);
                        }
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}


