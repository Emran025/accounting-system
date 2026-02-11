"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { ExpatForm } from "../../ExpatForm";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { ExpatRecord } from "@/app/hr/types";

export default function EditExpatPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [record, setRecord] = useState<ExpatRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUser(getStoredUser());
        loadRecord();
    }, [params.id]);

    const loadRecord = async () => {
        setIsLoading(true);
        try {
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.EXPAT_MANAGEMENT.BASE}/${params.id}`);
            setRecord(res.data || res);
        } catch (error) {
            showToast("فشل تحميل السجل", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModuleLayout groupKey="hr" requiredModule="expat-management">
            <PageHeader title="تعديل سجل مغترب" user={user} showDate={true} />
            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : (
                record && <ExpatForm record={record} />
            )}
        </ModuleLayout>
    );
}
