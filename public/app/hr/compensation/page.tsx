"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Compensation } from "./Compensation";

export default function CompensationPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="compensation">
            <PageHeader title="إدارة التعويضات" user={user} showDate={true} />
            <Compensation />
        </ModuleLayout>
    );
}


