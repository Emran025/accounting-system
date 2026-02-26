"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Compensation } from "./Compensation";

export default function CompensationPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <Compensation />
        </MainLayout>
    );
}


