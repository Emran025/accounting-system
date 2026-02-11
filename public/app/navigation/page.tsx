"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavigationCard, NavigationGrid, NavigationSidebar } from "@/components/navigation";
import { navigationGroups, getNavigationGroup } from "@/lib/navigation-config";
import { checkAuth, Permission, canAccess } from "@/lib/auth";
import { initSystemSettings } from "@/lib/settings";

export default function NavigationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeGroup, setActiveGroup] = useState("dashboard");
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      await initSystemSettings();
      const authState = await checkAuth();

      if (!authState.isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      setPermissions(authState.permissions);
      setIsLoading(false);

      // Check saved sidebar state
      const savedCollapsed = localStorage.getItem("navSidebarCollapsed");
      if (savedCollapsed === "true") {
        setIsContentExpanded(true);
        document.body.classList.add("nav-sidebar-is-collapsed");
      }
    };

    verifyAuth();
  }, [router]);

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsContentExpanded(collapsed);
  };

  // Filter groups based on permissions (show group if user has access to at least one link)
  const accessibleGroups = navigationGroups.filter((group) =>
    group.links.some((link) => canAccess(permissions, link.module, "view"))
  );

  const currentGroup = getNavigationGroup(activeGroup);
  const accessibleLinks = currentGroup
    ? currentGroup.links.filter((link) => canAccess(permissions, link.module, "view"))
    : [];

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-color)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--border-color)",
              borderTopColor: "var(--primary-color)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ color: "var(--text-secondary)" }}>جاري التحميل...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="navigation-page">
      <NavigationSidebar
        groups={accessibleGroups}
        activeGroup={activeGroup}
        onGroupSelect={setActiveGroup}
        onCollapsedChange={handleSidebarCollapse}
      />

      <main className={`navigation-content ${isContentExpanded ? "expanded" : ""}`}>
        <div className="navigation-header">
          <h1>{currentGroup?.label || "التنقل"}</h1>
          <p>اختر الوحدة التي تريد الوصول إليها</p>
        </div>

        <NavigationGrid>
          {accessibleLinks.map((link) => (
            <NavigationCard
              key={link.href + link.label}
              href={link.href}
              icon={link.icon}
              label={link.label}
              description={link.description}
            />
          ))}
        </NavigationGrid>
      </main>
    </div>
  );
}
