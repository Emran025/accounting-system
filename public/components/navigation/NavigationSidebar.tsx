"use client";

import { useState, useEffect } from "react";
import { getIcon } from "@/lib/icons";
import { NavigationGroup } from "@/lib/navigation-config";
import { FullLogo } from "@/components/ui/Logo";

interface NavigationSidebarProps {
  groups: NavigationGroup[];
  activeGroup: string;
  onGroupSelect: (key: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function NavigationSidebar({ 
  groups, 
  activeGroup, 
  onGroupSelect,
  onCollapsedChange 
}: NavigationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Check for saved collapsed state - only relevant if initial load is desktop
    if (window.innerWidth > 1024) {
      const saved = localStorage.getItem("navSidebarCollapsed");
      if (saved === "true") {
        setIsCollapsed(true);
        onCollapsedChange?.(true);
        document.body.classList.add("nav-sidebar-is-collapsed");
      }
    }

    // Handle Resize Events to reset states
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        // Desktop: Reset mobile states
        setIsMobileOpen(false);
        // Restore desktop state from storage
        const saved = localStorage.getItem("navSidebarCollapsed");
        if (saved === "true") {
          document.body.classList.add("nav-sidebar-is-collapsed");
        } else {
          document.body.classList.remove("nav-sidebar-is-collapsed");
        }
      } else {
        // Mobile: Reset desktop collapsed states so full menu shows
        document.body.classList.remove("nav-sidebar-is-collapsed");
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
      localStorage.setItem("navSidebarCollapsed", String(newState));
      onCollapsedChange?.(newState);

      // Update body class for global styling
      if (newState) {
        document.body.classList.add("nav-sidebar-is-collapsed");
      } else {
        document.body.classList.remove("nav-sidebar-is-collapsed");
      }
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const handleGroupClick = (key: string) => {
    onGroupSelect(key);
    closeMobileSidebar();
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

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <button
              key={group.key}
              className={`sidebar-nav-btn ${activeGroup === group.key ? "active" : ""}`}
              onClick={() => handleGroupClick(group.key)}
            >
              {getIcon(group.icon)}
              <span>{group.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
