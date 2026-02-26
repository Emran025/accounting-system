"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { KnowledgeBase } from "../knowledge-base/KnowledgeBase";

export default function ExpertisePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <KnowledgeBase />
        </MainLayout>
    );
}
