"use client";

import { MainLayout } from "@/components/layout";
import { ContractForm } from "../ContractForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddContractPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <ContractForm />
        </MainLayout>
    );
}
