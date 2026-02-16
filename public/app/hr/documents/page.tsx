"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { DocumentGeneration } from "./DocumentGeneration";

export default function DocumentsPage() {
    const user = getStoredUser();

    return (
        <ModuleLayout groupKey="hr" requiredModule="employees">
            <PageHeader title="المستندات والتقارير" user={user} showDate={true} />
            <DocumentGeneration />
        </ModuleLayout>
    );
}
