"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "@/components/ui";
import { initSystemSettings } from "@/lib/settings";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

interface MainLayoutProps {
  children: ReactNode;
  requiredModule?: string;
  requiredAction?: "view" | "create" | "edit" | "delete";
}

export function MainLayout({
  children,
  requiredModule,
  requiredAction = "view",
}: MainLayoutProps) {
  const router = useRouter();

  // Auth Store
  const {
    user,
    permissions,
    isLoading,
    checkAuth,
    isAuthenticated
  } = useAuthStore();

  // UI Store
  const {
    sidebarCollapsed,
    setSidebarCollapsed
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
        // We get fresh permissions from store (checkAuth updates them)
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
            router.push("/system/dashboard");
            return;
          }
        } else {
          // If required but permissions is not an array, deny access
          router.push("/system/dashboard");
          return;
        }
      }

      // Sidebar state is handled by useUIStore (persisted automatically)
      if (useUIStore.getState().sidebarCollapsed) {
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
      <Sidebar
        onCollapsedChange={setSidebarCollapsed}
      />
      <main className={`content ${sidebarCollapsed ? "expanded" : ""}`}>
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}

// Backward compatibility hook - proxies to useAuthStore
export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    permissions: store.permissions
  };
}

