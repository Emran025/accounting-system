"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIcon } from "@/lib/icons";
import { Permission, getSidebarLinks } from "@/lib/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { FullLogo } from "@/components/ui/Logo";

interface SidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapsedChange }: SidebarProps) {
  // Use UI Store for sidebar state
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { permissions, logout: logoutAction } = useAuthStore();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const links = getSidebarLinks(permissions);

  useEffect(() => {
    // Sync store state with prop callback (legacy support)
    onCollapsedChange?.(sidebarCollapsed);

    // Apply body class based on store state
    if (sidebarCollapsed) {
      document.body.classList.add("sidebar-is-collapsed");
    } else {
      document.body.classList.remove("sidebar-is-collapsed");
    }

    // Handle Resize Events to reset states
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        // Desktop: Reset mobile states
        setIsMobileOpen(false);
      } else {
        // Mobile: Reset desktop collapsed states so full menu shows
        // We don't change store here to preserve preference, but we remove the class for mobile view
        document.body.classList.remove("sidebar-is-collapsed");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarCollapsed, onCollapsedChange]);

  const handleToggle = () => {
    if (window.innerWidth <= 1024) {
      // Mobile Toggle
      setIsMobileOpen(!isMobileOpen);
    } else {
      // Desktop Collapse Toggle
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
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
        aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {getIcon("chevronRight")}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-visible" : ""}`}>
        <FullLogo isCollapsed={sidebarCollapsed} />
        <nav className="sidebar-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "active" : ""}
              onClick={closeMobileSidebar}
            >
              {getIcon(link.icon)}
              <span>{link.label}</span>
            </Link>
          ))}

          <a
            href="#"
            className="logout-btn"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            {getIcon("logout")}
            <span>تسجيل الخروج</span>
          </a>
        </nav>
      </aside>
    </>
  );
}
