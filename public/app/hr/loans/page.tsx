"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeeLoans } from "./EmployeeLoans";

export default function LoansPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="loans">
            <PageHeader title="القروض المالية للموظفين" user={user} showDate={true} />
            <EmployeeLoans />
        </ModuleLayout>
    );
}
