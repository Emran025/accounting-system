"use client";

import { useState, useEffect } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { TabNavigation } from "@/components/ui";
import { getStoredUser } from "@/lib/auth";

import { EmployeesTab } from "./components/EmployeesTab";
import { PayrollTab } from "./components/PayrollTab";

// If TabNavigation is not at that path, we might need to adjust or create it.
// Assuming it exists as per plan.

export default function HRPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("employees");

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout requiredModule="hr">
      <PageHeader title="الموارد البشرية" user={user} showDate={true} />

      <div className="settings-wrapper animate-fade">
        <TabNavigation 
          tabs={[
            { key: "employees", label: "إدارة الموظفين", icon: "fa-users" },
            { key: "payroll", label: "الرواتب والمستحقات", icon: "fa-money-bill-wave" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div style={{ marginTop: "1rem" }}>
            {activeTab === "employees" && <EmployeesTab />}
            {activeTab === "payroll" && <PayrollTab />}
        </div>
      </div>
    </MainLayout>
  );
}
