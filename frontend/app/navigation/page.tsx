"use client";

import { useSearchParams } from "next/navigation";
import { NavigationCard, NavigationGrid } from "@/components/navigation";
import { getNavigationGroup, isNavigationGroup, isNavigationLink } from "@/lib/navigation-config";
import { canAccess } from "@/lib/auth";
import { MainLayout } from "@/components/layout";
import { useAuthStore } from "@/stores/useAuthStore";
import { Suspense } from "react";

function NavigationContent() {
  const searchParams = useSearchParams();
  const { permissions } = useAuthStore();

  // Read the active group from the query string, defaulting to "dashboard"
  const activeGroup = searchParams.get("group") || "dashboard";

  const currentGroup = getNavigationGroup(activeGroup);

  return (
    <>
      <NavigationGrid>
        {currentGroup && currentGroup.items.map((item) => {
          if (isNavigationGroup(item)) {
            // Render a folder card
            return (
              <NavigationCard
                key={item.key}
                href={`/navigation?group=${item.key}`}
                icon={item.icon}
                label={item.label}
                description="مجلد قوائم"
              />
            );
          } else if (isNavigationLink(item)) {
            if (!canAccess(permissions, item.module, "view")) return null;
            return (
              <NavigationCard
                key={item.href + item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                description={item.description}
              />
            );
          }
          return null;
        })}
      </NavigationGrid>
    </>
  );
}

export default function NavigationPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>جاري التحميل...</div>}>
        <NavigationContent />
      </Suspense>
    </MainLayout>
  );
}
