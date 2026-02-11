"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { WellnessModule } from "./WellnessModule";

export default function WellnessPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="wellness">
            <PageHeader title="برامج العافية" user={user} showDate={true} />
            <WellnessModule />
        </ModuleLayout>
    );
}
