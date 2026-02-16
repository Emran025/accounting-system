"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { HrAdministration } from "./HrAdministration";

export default function HrAdministrationPage() {
    const user = getStoredUser();

    return (
        <ModuleLayout groupKey="hr" requiredModule="employees">
            <PageHeader title="إدارة الموارد البشرية" user={user} showDate={true} />
            <HrAdministration />
        </ModuleLayout>
    );
}
