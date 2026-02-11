"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { AssetForm } from "../AssetForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddAssetPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="employee-assets">
            <PageHeader title="إضافة أصل جديد" user={user} showDate={true} />
            <AssetForm />
        </ModuleLayout>
    );
}
