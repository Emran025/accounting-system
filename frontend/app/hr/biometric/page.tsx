"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { BiometricControl } from "./BiometricControl";

export default function BiometricPage() {
    const user = getStoredUser();

    return (
        <MainLayout >
            <BiometricControl />
        </MainLayout>
    );
}
