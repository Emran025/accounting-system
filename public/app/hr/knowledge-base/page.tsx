"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { KnowledgeBase } from "./KnowledgeBase";

export default function KnowledgeBasePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="knowledge">
            <PageHeader title="قاعدة المعرفة" user={user} showDate={true} />
            <KnowledgeBase />
        </ModuleLayout>
    );
}


