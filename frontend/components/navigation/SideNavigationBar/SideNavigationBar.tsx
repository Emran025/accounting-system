"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigationGroups, NavigationGroup, NavigationLink, getAllNavigationLinks, isNavigationGroup, NavigationItem } from "@/lib/navigation-config";
import { canAccess } from "@/lib/auth";
import { useUIStore } from "@/stores/useUIStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { SectionHeader } from "./components/SectionHeader";
import { ContextMenuPortal } from "./components/ContextMenuPortal";
import { SidebarItem } from "./components/SidebarItem";
import { SidebarFolder } from "./components/SidebarFolder";
import { getIcon } from "@/lib/icons";
import React from "react";

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
    /** Externally controlled mobile sidebar visibility */
    externalMobileOpen?: boolean;
    /** Callback when mobile sidebar should be closed */
    onExternalMobileClose?: () => void;
}

export function SideNavigationBar({ onCollapsedChange, externalMobileOpen, onExternalMobileClose }: SideNavigationBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { permissions } = useAuthStore();

    const {
        sideNavCollapsed,
        setSideNavCollapsed,
        sideNavWidth,
        setSideNavWidth,
        recentSectionHeight,
        systemMenuSectionHeight,
        favoritesSectionHeight,
        setSectionHeight,
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
    const [isSectionResizing, setIsSectionResizing] = useState(false);
    const [isDesktop, setIsDesktop] = useState(true);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        path: string;
        type: "screen" | "folder";
    } | null>(null);
    const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    // Sync external mobile open state
    useEffect(() => {
        if (externalMobileOpen !== undefined) {
            setIsMobileOpen(externalMobileOpen);
        }
    }, [externalMobileOpen]);

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

    /* ── Section verticaze handler factory ── */
    const sectionsData = React.useMemo(() => [
        { id: 'opened' as const, collapsed: openedSectionCollapsed, height: recentSectionHeight },
        { id: 'systemMenu' as const, collapsed: systemMenuSectionCollapsed, height: systemMenuSectionHeight },
        { id: 'favorites' as const, collapsed: favoritesSectionCollapsed, height: favoritesSectionHeight }
    ], [
        openedSectionCollapsed, recentSectionHeight,
        systemMenuSectionCollapsed, systemMenuSectionHeight,
        favoritesSectionCollapsed, favoritesSectionHeight
    ]);

    const expandedIds = React.useMemo(() => sectionsData.filter(s => !s.collapsed).map(s => s.id), [sectionsData]);
    const lastExpandedId = expandedIds.length > 0 ? expandedIds[expandedIds.length - 1] : null;

    const sectionResizeRef = useRef<{
        startY: number;
        topId: 'opened' | 'systemMenu' | 'favorites';
        bottomId: 'opened' | 'systemMenu' | 'favorites';
        startTopHeight: number;
        startBottomHeight: number;
    } | null>(null);

    const createSectionResizeHandler = useCallback(
        (currentIndex: number) => {
            // Find the closest expanded section ABOVE the handle
            const topSection = [...sectionsData].slice(0, currentIndex).reverse().find(s => !s.collapsed);
            // Find the closest expanded section BELOW the handle (inclusive)
            const bottomSection = [...sectionsData].slice(currentIndex).find(s => !s.collapsed);

            if (!topSection || !bottomSection) return undefined;

            return (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSectionResizing(true);

                sectionResizeRef.current = {
                    startY: e.clientY,
                    topId: topSection.id,
                    bottomId: bottomSection.id,
                    startTopHeight: topSection.height,
                    startBottomHeight: bottomSection.height
                };

                const handleMouseMove = (ev: MouseEvent) => {
                    if (!sectionResizeRef.current) return;
                    const state = sectionResizeRef.current;
                    let diff = ev.clientY - state.startY;

                    // Clamp to prevent collapsing sections entirely
                    const minHeight = 40;
                    if (state.startTopHeight + diff < minHeight) {
                        diff = minHeight - state.startTopHeight;
                    }
                    if (state.startBottomHeight - diff < minHeight) {
                        diff = state.startBottomHeight - minHeight;
                    }

                    // Update BOTH sections synchronously so overall height remains strictly constant
                    setSectionHeight(state.topId, state.startTopHeight + diff);
                    setSectionHeight(state.bottomId, state.startBottomHeight - diff);
                };

                const handleMouseUp = () => {
                    setIsSectionResizing(false);
                    sectionResizeRef.current = null;
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                };

                window.addEventListener("mousemove", handleMouseMove);
                window.addEventListener("mouseup", handleMouseUp);
            };
        },
        [sectionsData, setSectionHeight]
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
        onExternalMobileClose?.();
        if (autoCollapseOnNavigate && isDesktop) {
            setSideNavCollapsed(true);
        }
    };

    /* ── Folder click handler (opens card view) ── */
    const handleFolderClick = (folderKey: string) => {
        router.push(`/navigation?group=${folderKey}`);
        setIsMobileOpen(false);
        onExternalMobileClose?.();
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
        return getAllNavigationLinks(navigationGroups).filter((l) =>
            canAccess(permissions, l.module, "view")
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
                onClick={() => {
                    setIsMobileOpen(false);
                    onExternalMobileClose?.();
                }}
            />

            {/* ── Main Sidebar ── */}
            <aside
                ref={sidebarRef}
                className={`side-navigation-bar ${sideNavCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-visible" : ""} ${isResizing || isSectionResizing ? "resizing" : ""}`}
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
                            sectionHeight={recentSectionHeight}
                            onResizeStart={createSectionResizeHandler(0)}
                            isResizing={isSectionResizing && sectionResizeRef.current?.bottomId === 'opened'}
                            isLastExpanded={lastExpandedId === 'opened'}
                        >
                            <div className="sidenav-section-content">
                                {recentScreens.length === 0 ? (
                                    <div className="sidenav-empty">No recent screens</div>
                                ) : (
                                    recentScreens.map((path) => {
                                        const link = findLink(path);
                                        if (!link) return null;
                                        const group = navigationGroups.find((g) =>
                                            getAllNavigationLinks([g]).some((l) => l.href === path)
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
                        </SectionHeader>
                    )}

                    {/* ═══ Section 2: System Menu (Full Tree) ═══ */}
                    {!sideNavCollapsed && (
                        <SectionHeader
                            title="القائمة الأساسية"
                            icon="sitemap"
                            collapsed={systemMenuSectionCollapsed}
                            onToggle={() => toggleSection("systemMenu")}
                            sectionHeight={systemMenuSectionHeight}
                            onResizeStart={createSectionResizeHandler(1)}
                            isResizing={isSectionResizing && sectionResizeRef.current?.bottomId === 'systemMenu'}
                            isLastExpanded={lastExpandedId === 'systemMenu'}
                        >
                            <div className={`sidenav-section-content ${sideNavCollapsed ? "collapsed-mode" : ""}`}>
                                {(() => {
                                    const renderNavGroup = (group: NavigationGroup, depth = 0): React.ReactNode => {
                                        const accessibleLinks = getAllNavigationLinks([group]).filter((l) =>
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
                                                {group.items && group.items.length > 0 && isNavigationGroup(group.items[0])
                                                    ? (group.items as NavigationGroup[]).map((childGroup) => renderNavGroup(childGroup, depth + 1))
                                                    : (group.items as NavigationLink[]).map((link) => {
                                                        if (!canAccess(permissions, link.module, "view")) return null;
                                                        return (
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
                                                        );
                                                    })}
                                            </SidebarFolder>
                                        );
                                    };

                                    return navigationGroups.map((group) => renderNavGroup(group));
                                })()}
                            </div>
                        </SectionHeader>
                    )}

                    {/* ═══ Section 3: Favorites ═══ */}
                    {(() => {
                        // Compute resolvable favorites only
                        const resolvedFavorites = favoriteScreens
                            .map((path) => {
                                const link = findLink(path);
                                if (!link) return null;
                                const group = navigationGroups.find((g) =>
                                    getAllNavigationLinks([g]).some((l) => l.href === path)
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
                                        sectionHeight={favoritesSectionHeight}
                                        onResizeStart={createSectionResizeHandler(2)}
                                        isResizing={isSectionResizing && sectionResizeRef.current?.bottomId === 'favorites'}
                                        isLastExpanded={lastExpandedId === 'favorites'}
                                    >
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
                                    </SectionHeader >
                                )}
                            </>
                        );
                    })()}
                </div >

                {/* Resize handle (desktop only, non-collapsed) */}
                {
                    !sideNavCollapsed && (
                        <div
                            className="sidenav-resize-handle"
                            onMouseDown={handleResizeStart}
                        />
                    )
                }
            </aside >

            {/* ── Context Menu ── */}
            {
                contextMenu && (
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
                )
            }
        </>
    );
}


