"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout";
import { TabNavigation } from "@/components/ui";

import { StoreSettingsTab } from "./components/StoreSettingsTab";
import { InvoiceSettingsTab } from "./components/InvoiceSettingsTab";
import { SecurityTab } from "./components/SecurityTab";
import { SessionsTab } from "./components/SessionsTab";


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("store");

  return (
    <MainLayout requiredModule="settings">
      <div className="settings-wrapper animate-fade">
        <TabNavigation
          tabs={[
            { key: "store", label: "معلومات المتجر", icon: "fa-store" },
            { key: "invoice", label: "إعدادات الفاتورة", icon: "fa-file-invoice" },
            { key: "security", label: "الحساب والأمان", icon: "fa-lock" },
            { key: "sessions", label: "الجلسات النشطة", icon: "fa-desktop" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div style={{ marginTop: "1rem", }}>
          {activeTab === "store" && <StoreSettingsTab />}
          {activeTab === "invoice" && <InvoiceSettingsTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "sessions" && <SessionsTab />}
        </div>
      </div>
    </MainLayout>
  );
}
