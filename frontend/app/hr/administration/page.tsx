"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { HrAdministration } from "./HrAdministration";

export default function HrAdministrationPage() {
    const user = getStoredUser();

    return (
        <MainLayout >
            <HrAdministration />
        </MainLayout>
    );
}
