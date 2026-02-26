"use client";

import { MainLayout } from "@/components/layout";
import { AssetForm } from "../AssetForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function AddAssetPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    return (
        <MainLayout >
            <AssetForm />
        </MainLayout>
    );
}
