"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { DocumentGeneration } from "./DocumentGeneration";

export default function DocumentsPage() {
    const user = getStoredUser();

    return (
        <MainLayout >
            <DocumentGeneration />
        </MainLayout>
    );
}
