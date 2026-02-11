"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { ContractForm } from "../ContractForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddContractPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="contracts">
            <PageHeader title="إضافة عقد جديد" user={user} showDate={true} />
            <ContractForm />
        </ModuleLayout>
    );
}
