"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ModuleSidebar } from "./ModuleSidebar";
import { ToastContainer } from "@/components/ui";
import { initSystemSettings } from "@/lib/settings";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { User, Permission } from "@/lib/auth";

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

  // Auth Store
  const {
    user,
    permissions,
    isLoading,
    checkAuth
  } = useAuthStore();

  // UI Store
  const {
    moduleSidebarCollapsed,
    setModuleSidebarCollapsed
  } = useUIStore();

  useEffect(() => {
    const verifyAuth = async () => {
      // Initialize settings first so they are available for all components
      await initSystemSettings();

      const isAuth = await checkAuth();

      if (!isAuth) {
        router.push("/auth/login");
        return;
      }

      // Check module access if required
      if (requiredModule) {
        const currentPermissions = useAuthStore.getState().permissions;

        if (Array.isArray(currentPermissions)) {
          const hasAccess = currentPermissions.some(
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
        } else {
          // If required but permissions is not an array, deny access
          router.push("/navigation");
          return;
        }
      }

      // Sidebar state is handled by useUIStore (persisted automatically)
      if (useUIStore.getState().moduleSidebarCollapsed) {
        document.body.classList.add("sidebar-is-collapsed");
      }
    };

    verifyAuth();
  }, [router, requiredModule, requiredAction, checkAuth]);

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
        onCollapsedChange={setModuleSidebarCollapsed}
      />
      <main className={`content ${moduleSidebarCollapsed ? "expanded" : ""}`}>
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}

// Backward compatibility hook
export function useModuleAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    permissions: store.permissions
  };
}
