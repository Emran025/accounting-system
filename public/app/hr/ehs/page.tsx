"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EhsModule } from "./EhsModule";

export default function EhsPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="ehs">
            <PageHeader title="البيئة والصحة والسلامة" user={user} showDate={true} />
            <EhsModule />
        </ModuleLayout>
    );
}
