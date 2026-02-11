"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { ExpatForm } from "../ExpatForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddExpatPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="expat-management">
            <PageHeader title="إضافة سجل مغترب جديد" user={user} showDate={true} />
            <ExpatForm />
        </ModuleLayout>
    );
}
