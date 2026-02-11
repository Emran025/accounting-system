"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { KnowledgeBase } from "../knowledge-base/KnowledgeBase";

export default function ExpertisePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <ModuleLayout groupKey="hr" requiredModule="expertise">
            <PageHeader title="دليل الخبراء وقاعدة المعرفة" user={user} showDate={true} />
            <KnowledgeBase />
        </ModuleLayout>
    );
}
