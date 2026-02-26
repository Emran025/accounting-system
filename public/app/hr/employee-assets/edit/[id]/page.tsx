"use client";

import { MainLayout } from "@/components/layout";
import { AssetForm } from "../../AssetForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { EmployeeAsset } from "@/app/hr/types";

export default function EditAssetPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [asset, setAsset] = useState<EmployeeAsset | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUser(getStoredUser());
        loadAsset();
    }, [params.id]);

    const loadAsset = async () => {
        setIsLoading(true);
        try {
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_ASSETS.BASE}/${params.id}`);
            setAsset(res.data || res);
        } catch (error) {
            showToast("فشل تحميل بيانات الأصل", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainLayout >
            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : (
                asset && <AssetForm asset={asset} />
            )}
        </MainLayout>
    );
}
