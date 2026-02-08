"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { ModulesStatus } from "./ModulesStatus";

export default function ModulesStatusPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="dashboard" requiredModule="dashboard">
            <PageHeader title="حالة الوحدات" user={user} showDate={true} />
            <ModulesStatus />
        </ModuleLayout>
    );
}


