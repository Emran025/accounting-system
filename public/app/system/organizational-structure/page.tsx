"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { TabNavigation } from "@/components/ui";
import { User, getStoredUser } from "@/lib/auth";
import { OrganizationalStructure } from "./OrganizationalStructure";

type OrgTab = "dashboard" | "nodes" | "meta_types" | "topology_rules" | "links" | "hierarchy" | "scope_context" | "integrity" | "change_history";

export default function OrganizationalStructurePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<OrgTab>("dashboard");

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="dashboard" requiredModule="org_structure">
      <PageHeader
        title="الهيكل التنظيمي"
        user={user}
        showDate={true}
      />
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
        <div style={{ marginTop: "1rem" }}>
          <OrganizationalStructure activeTab={activeTab} />
        </div>
      </div>
    </ModuleLayout>
  );
}
