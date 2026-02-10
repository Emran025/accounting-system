"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { getIcon } from "@/lib/icons";

export default function ExpertisePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="expertise">
            <PageHeader title="دليل الخبراء" user={user} showDate={true} />
            <div className="sales-card animate-fade">
                <div className="text-center py-12">
                    <div className="text-6xl mb-4" style={{ color: 'var(--primary-color)', opacity: 0.5 }}>
                        <i className="fas fa-users-gear"></i>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">هذه الصفحة قيد التطوير</h2>
                    <p className="text-muted">نحن نعمل بجد لإحضار ميزة دليل الخبراء إليك قريباً.</p>
                </div>
            </div>
        </ModuleLayout>
    );
}
