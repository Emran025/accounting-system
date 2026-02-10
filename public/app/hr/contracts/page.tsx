"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Contracts } from "@/app/hr/contracts/Contracts";

export default function ContractsPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="employees">
            <PageHeader title="العقود والاتفاقيات" user={user} showDate={true} />
            <Contracts />
        </ModuleLayout>
    );
}
