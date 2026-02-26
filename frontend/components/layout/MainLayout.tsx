"use client";

import { useEffect, ReactNode, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  SideNavigationBar,
  TopGlobalBar,
  SearchNavigationBar,
  StatusNotificationBar,
} from "@/components/navigation";
import { ToastContainer, FullLogo } from "@/components/ui";
import { initSystemSettings } from "@/lib/settings";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

interface MainLayoutProps {
  children: ReactNode;
  requiredModule?: string;
  requiredAction?: "view" | "create" | "edit" | "delete";
  isWatermark?: boolean;
}

/**
 * MainLayout — uses the new SideNavigationBar and global shell bars.
 * This is for testing purposes before migration.
 */
export function MainLayout({
  children,
  requiredModule,
  requiredAction = "view",
  isWatermark = true,
}: MainLayoutProps) {
  const router = useRouter();

  const { isLoading, checkAuth } = useAuthStore();
  const { sideNavCollapsed, sideNavWidth, setSideNavCollapsed } = useUIStore();

  useEffect(() => {
    const verifyAuth = async () => {
      await initSystemSettings();
      const isAuth = await checkAuth();

      if (!isAuth) {
        router.push("/auth/login");
        return;
      }

      if (requiredModule) {
        const currentPermissions = useAuthStore.getState().permissions;
        if (Array.isArray(currentPermissions)) {
          const hasAccess = currentPermissions.some(
            (p) =>
              (p.module === requiredModule || p.module === "*") &&
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
          router.push("/navigation");
          return;
        }
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
          <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
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
    <div className="test-shell-column">
      <div>
        <Suspense fallback={<div className="top-global-bar" />}>
          <TopGlobalBar />
        </Suspense>
        <Suspense fallback={<div className="search-navigation-bar" />}>
          <SearchNavigationBar />
        </Suspense>
      </div>
      <div className="test-main-container">
        <SideNavigationBar onCollapsedChange={setSideNavCollapsed} />
        <main className="main-layout-content" >
          <FullLogo isWatermark={isWatermark} type="LogoVertical" size={{ width: 600, height: 600 }}>
            {children}
          </FullLogo>
        </main>
        <ToastContainer />
      </div>
      <div style={{ alignItems: "stretch" }}>
        <StatusNotificationBar />
      </div>
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
