"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { KnowledgeBase } from "./KnowledgeBase";

export default function KnowledgeBasePage() {
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


