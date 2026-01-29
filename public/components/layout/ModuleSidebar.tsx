"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIcon } from "@/lib/icons";
import { getNavigationGroup, NavigationLink } from "@/lib/navigation-config";
import { FullLogo } from "@/components/ui/Logo";
import { Permission, canAccess } from "@/lib/auth";

interface ModuleSidebarProps {
  groupKey: string;
  permissions: Permission[];
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function ModuleSidebar({ 
  groupKey, 
  permissions, 
  onCollapsedChange 
}: ModuleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const group = getNavigationGroup(groupKey);
  
  // Filter links based on permissions
  const accessibleLinks: NavigationLink[] = group
    ? group.links.filter((link) => canAccess(permissions, link.module, "view"))
    : [];

  useEffect(() => {
    // Check for saved collapsed state - only relevant if initial load is desktop
    if (window.innerWidth > 1024) {
      const saved = localStorage.getItem("moduleSidebarCollapsed");
      if (saved === "true") {
        setIsCollapsed(true);
        onCollapsedChange?.(true);
        document.body.classList.add("sidebar-is-collapsed");
      }
    }

    // Handle Resize Events to reset states
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        // Desktop: Reset mobile states
        setIsMobileOpen(false);
        // Restore desktop state from storage
        const saved = localStorage.getItem("moduleSidebarCollapsed");
        if (saved === "true") {
          document.body.classList.add("sidebar-is-collapsed");
        } else {
          document.body.classList.remove("sidebar-is-collapsed");
        }
      } else {
        // Mobile: Reset desktop collapsed states so full menu shows
        document.body.classList.remove("sidebar-is-collapsed");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [onCollapsedChange]);

  const handleToggle = () => {
    if (window.innerWidth <= 1024) {
      // Mobile Toggle
      setIsMobileOpen(!isMobileOpen);
    } else {
      // Desktop Collapse Toggle
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      localStorage.setItem("moduleSidebarCollapsed", String(newState));
      onCollapsedChange?.(newState);

      // Update body class for global styling
      if (newState) {
        document.body.classList.add("sidebar-is-collapsed");
      } else {
        document.body.classList.remove("sidebar-is-collapsed");
      }
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? "active" : ""}`}
        onClick={closeMobileSidebar}
      />

      {/* Toggle button */}
      <button
        className={`sidebar-toggle-btn ${isMobileOpen ? "mobile-open" : ""}`}
        onClick={handleToggle}
        aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {getIcon("chevronRight")}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-visible" : ""}`}>
        <FullLogo />

        {/* Module Header with Back Button */}
        {!isCollapsed && group && (
          <div className="module-sidebar-header">
            <Link href="/navigation" className="back-to-nav-btn">
              {getIcon("chevronRight")}
              <span>العودة</span>
            </Link>
            <h3 className="module-sidebar-title">{group.label}</h3>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {accessibleLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={pathname === link.href ? "active" : ""}
              onClick={closeMobileSidebar}
              title={link.description}
            >
              {getIcon(link.icon)}
              <span>{link.label}</span>
              {link.description.includes("قريباً") && (
                <span className="coming-soon-badge">قريباً</span>
              )}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
