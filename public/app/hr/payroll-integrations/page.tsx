"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { PostPayrollIntegrations } from "./PostPayrollIntegrations";

export default function PayrollIntegrationsPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="payroll">
            <PageHeader title="تكاملات ما بعد الرواتب" user={user} showDate={true} />
            <PostPayrollIntegrations />
        </ModuleLayout>
    );
}
