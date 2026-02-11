"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { TravelExpenses } from "./TravelExpenses";

export default function TravelExpensesPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="travel">
            <PageHeader title="السفر والمصروفات" user={user} showDate={true} />
            <TravelExpenses />
        </ModuleLayout>
    );
}
