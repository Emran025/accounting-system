"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { TabMiniNavigation } from "@/components/ui";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess } from "@/lib/auth";

import { CurrencyPolicyTab } from "./components/CurrencyPolicyTab";
import { CurrencyListTab } from "./components/CurrencyListTab";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedPermissions = getStoredPermissions();
    setUser(storedUser);
    setPermissions(storedPermissions);
  }, []);

  return (
    <MainLayout requiredModule="currency">


      {/* Inner Tab Navigation */}
      <div className="settings-wrapper animate-fade">
        <TabMiniNavigation
          title="إدارة العملات والسياسات المالية"
          icon="fa-cog"
          tabs={[
            { key: "list", label: "قائمة العملات", icon: "fa-list" },
            { key: "policy", label: "سياسة الحوكمة", icon: "fa-shield-alt" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div style={{ marginTop: "1rem", }}>
          {activeTab === "list" && <CurrencyListTab />}
          {activeTab === "policy" && <CurrencyPolicyTab />}
        </div>
      </div>
    </MainLayout>
  );
}
