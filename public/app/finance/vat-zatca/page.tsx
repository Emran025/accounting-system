"use client";

import { useState, useEffect } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { TabMiniNavigation } from "@/components/ui";
import { User, getStoredUser, getStoredPermissions, Permission } from "@/lib/auth";

import { GovernmentFeesTab } from "./components/GovernmentFeesTab";
import { ZatcaSettingsTab } from "./components/ZatcaSettingsTab";

export default function VatZatcaPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [activeTab, setActiveTab] = useState("fees");

    useEffect(() => {
        const storedUser = getStoredUser();
        const storedPermissions = getStoredPermissions();
        setUser(storedUser);
        setPermissions(storedPermissions);
    }, []);

    return (
        <MainLayout requiredModule="dashboard">
            <PageHeader title="إدارة الضرائب والزكاة" user={user} showDate={true} />

            <div className="settings-wrapper animate-fade">
                <TabMiniNavigation
                    title="إعدادات الضرائب (VAT) والربط مع زاتكا (ZATCA)"
                    icon="fa-shield-check"
                    tabs={[
                        { key: "fees", label: "الرسوم والالتزامات", icon: "fa-scale-balanced" },
                        { key: "zatca", label: "إعدادات زاتكا (ZATCA)", icon: "fa-shield-check" },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div style={{ marginTop: "1rem" }}>
                    {activeTab === "fees" && <GovernmentFeesTab />}
                    {activeTab === "zatca" && <ZatcaSettingsTab />}
                </div>
            </div>
        </MainLayout>
    );
}
