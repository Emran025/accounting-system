"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { SystemTemplates } from "./SystemTemplates";

export default function TemplatesPage() {
    const user = getStoredUser();

    return (
        <MainLayout >
            <SystemTemplates />
        </MainLayout>
    );
}
