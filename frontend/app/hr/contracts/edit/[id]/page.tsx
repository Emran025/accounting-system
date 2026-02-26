"use client";

import { MainLayout } from "@/components/layout";
import { ContractForm } from "../../ContractForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { EmployeeContract } from "@/app/hr/types";

export default function EditContractPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [contract, setContract] = useState<EmployeeContract | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUser(getStoredUser());
        loadContract();
    }, [params.id]);

    const loadContract = async () => {
        setIsLoading(true);
        try {
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.CONTRACTS.BASE}/${params.id}`);
            setContract(res.data || res);
        } catch (error) {
            showToast("فشل تحميل بيانات العقد", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainLayout >
            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : (
                contract && <ContractForm contract={contract} />
            )}
        </MainLayout>
    );
}
