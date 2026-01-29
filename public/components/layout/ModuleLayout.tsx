"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ModuleSidebar } from "./ModuleSidebar";
import { ToastContainer } from "@/components/ui";
import { checkAuth, Permission, User } from "@/lib/auth";
import { initSystemSettings } from "@/lib/api";

interface ModuleLayoutProps {
  children: ReactNode;
  groupKey: string;
  requiredModule?: string;
  requiredAction?: "view" | "create" | "edit" | "delete";
}

export function ModuleLayout({
  children,
  groupKey,
  requiredModule,
  requiredAction = "view",
}: ModuleLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      // Initialize settings first so they are available for all components
      await initSystemSettings();
      
      const authState = await checkAuth();

      if (!authState.isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Check module access if required
      if (requiredModule && Array.isArray(authState.permissions)) {
        const hasAccess = authState.permissions.some(
          (p) =>
            p.module === requiredModule &&
            (requiredAction === "view"
              ? p.can_view
              : requiredAction === "create"
              ? p.can_create
              : requiredAction === "edit"
              ? p.can_edit
              : p.can_delete)
        );

        if (!hasAccess) {
          router.push("/navigation");
          return;
        }
      } else if (requiredModule) {
        // If required but permissions is not an array, deny access
        router.push("/navigation");
        return;
      }

      setUser(authState.user);
      setPermissions(authState.permissions);
      setIsLoading(false);

      // Check saved sidebar state
      const savedCollapsed = localStorage.getItem("moduleSidebarCollapsed");
      if (savedCollapsed === "true") {
        setIsContentExpanded(true);
        document.body.classList.add("sidebar-is-collapsed");
      }
    };

    verifyAuth();
  }, [router, requiredModule, requiredAction]);

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsContentExpanded(collapsed);
  };

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
    <div className="main-container">
      <ModuleSidebar
        groupKey={groupKey}
        permissions={permissions}
        onCollapsedChange={handleSidebarCollapse}
      />
      <main className={`content ${isContentExpanded ? "expanded" : ""}`}>
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}

// Export a context for accessing user/permissions in child components
import { createContext, useContext } from "react";

interface ModuleAuthContextType {
  user: User | null;
  permissions: Permission[];
}

export const ModuleAuthContext = createContext<ModuleAuthContextType>({
  user: null,
  permissions: [],
});

export function useModuleAuth() {
  return useContext(ModuleAuthContext);
}
