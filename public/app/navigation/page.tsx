"use client";

import { useSearchParams } from "next/navigation";
import { NavigationCard, NavigationGrid } from "@/components/navigation";
import { getNavigationGroup } from "@/lib/navigation-config";
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
  const accessibleLinks = currentGroup
    ? currentGroup.links.filter((link) => canAccess(permissions, link.module, "view"))
    : [];

  return (
    <>
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
