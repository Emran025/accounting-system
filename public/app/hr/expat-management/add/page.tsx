"use client";

import { MainLayout } from "@/components/layout";
import { ExpatForm } from "../ExpatForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddExpatPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <ExpatForm />
        </MainLayout>
    );
}
