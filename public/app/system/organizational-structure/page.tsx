"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout";
import { TabNavigation } from "@/components/ui";
import { OrganizationalStructure } from "./OrganizationalStructure";

type OrgTab = "dashboard" | "nodes" | "meta_types" | "topology_rules" | "links" | "hierarchy" | "scope_context" | "integrity" | "change_history";

export default function OrganizationalStructurePage() {
  const [activeTab, setActiveTab] = useState<OrgTab>("dashboard");

  return (
    <MainLayout>
      <div className="settings-wrapper animate-fade">
        <TabNavigation
          tabs={[
            { key: "dashboard", label: "لوحة التحكم", icon: "dashboard" },
            { key: "hierarchy", label: "الشجرة التنظيمية", icon: "tree" },
            { key: "nodes", label: "الوحدات التنظيمية", icon: "sitemap" },
            { key: "links", label: "الارتباطات", icon: "link" },
            { key: "meta_types", label: "أنواع الوحدات", icon: "cube" },
            { key: "topology_rules", label: "قواعد الارتباط", icon: "route" },
            { key: "scope_context", label: "تحليل السياق", icon: "search" },
            { key: "integrity", label: "سلامة الهيكل", icon: "check-shield" },
            { key: "change_history", label: "سجل التغييرات", icon: "history" },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as OrgTab)}
        />
        <div>
          <OrganizationalStructure activeTab={activeTab} />
        </div>
      </div>
    </MainLayout>
  );
}
