"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Contracts } from "@/app/hr/contracts/Contracts";

export default function ContractsPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <Contracts />
        </MainLayout>
    );
}
