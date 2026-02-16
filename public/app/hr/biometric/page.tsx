"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { BiometricControl } from "./BiometricControl";

export default function BiometricPage() {
    const user = getStoredUser();

    return (
        <ModuleLayout groupKey="hr" requiredModule="attendance">
            <PageHeader title="أجهزة البصمة والحضور" user={user} showDate={true} />
            <BiometricControl />
        </ModuleLayout>
    );
}
