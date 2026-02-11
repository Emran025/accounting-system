"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { CorporateCommunications } from "./CorporateCommunications";

export default function CommunicationsPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="communications">
            <PageHeader title="الاتصالات المؤسسية" user={user} showDate={true} />
            <CorporateCommunications />
        </ModuleLayout>
    );
}
