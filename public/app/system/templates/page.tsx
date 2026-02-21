"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { SystemTemplates } from "./SystemTemplates";

export default function TemplatesPage() {
    const user = getStoredUser();

    return (
        <ModuleLayout groupKey="dashboard" requiredModule="dashboard">
            <PageHeader title="إدارة قوالب النظام" user={user} showDate={true} />
            <SystemTemplates />
        </ModuleLayout>
    );
}
