"use client";

import { useState } from "react";
import { TabNavigation } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { CapacityPlanningTab } from "./components/CapacityPlanningTab";
import { PermissionTemplatesTab } from "./components/PermissionTemplatesTab";
import { UserLinkingTab } from "./components/UserLinkingTab";
import { RolesTab } from "@/app/system/settings/components/RolesTab";

export function HrAdministration() {
    const [activeTab, setActiveTab] = useState<"capacity" | "roles" | "templates" | "linking">("capacity");

    const tabs = [
        { key: "capacity" as const, label: "المسميات والاستيعاب", icon: "briefcase" },
        { key: "roles" as const, label: "الأدوار والصلاحيات", icon: "shield" },
        { key: "templates" as const, label: "قوالب الصلاحيات", icon: "copy" },
        { key: "linking" as const, label: "ربط المستخدمين", icon: "link" },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="إدارة الموارد البشرية"
                titleIcon="settings"
                actions={
                    <>
                        <TabNavigation
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={(key) => setActiveTab(key as any)}
                        />
                    </>
                }
            />

            <div style={{ padding: "16px 0" }}>
                {activeTab === "capacity" && <CapacityPlanningTab />}
                {activeTab === "roles" && <RolesTab />}
                {activeTab === "templates" && <PermissionTemplatesTab />}
                {activeTab === "linking" && <UserLinkingTab />}
            </div>
        </div>
    );
}
