"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { MainLayout } from "@/components/layout";
import { getStoredUser, User } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Employee } from "../../../types";
import { TabNavigation, Button } from "@/components/ui";
import { useRouter } from "next/navigation";

// Lazy load tab components
const BasicInfoTab = dynamic(() => import("./components/BasicInfoTab"), {
    loading: () => <div className="p-10 text-center text-muted">جاري تحميل البيانات الأساسية...</div>
});
const DocumentsTab = dynamic(() => import("./components/DocumentsTab"), {
    loading: () => <div className="p-10 text-center text-muted">جاري تحميل المستندات...</div>
});
const FinancialTab = dynamic(() => import("./components/FinancialTab"), {
    loading: () => <div className="p-10 text-center text-muted">جاري تحميل البيانات المالية...</div>
});

export default function ViewEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("info");

    useEffect(() => {
        setUser(getStoredUser());
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.withId(id));
            const emp = (res.data as Employee) || (res as unknown as Employee);
            setEmployee(emp);
        } catch (e) {
            console.error("Failed to load employee", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <MainLayout >
                <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }}></div>
                    <p className="text-muted" style={{ fontSize: '1.1rem' }}>جاري تحميل بيانات الموظف...</p>
                </div>
            </MainLayout>
        );
    }

    if (!employee) {
        return (
            <MainLayout >
                <div className="empty-state animate-fade" style={{ minHeight: '60vh', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: '#fee2e2', color: '#ef4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '2rem', fontSize: '3rem'
                    }}>
                        <i className="fas fa-user-slash"></i>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>الموظف غير موجود</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: '1.6', marginBottom: '2.5rem', textAlign: 'center' }}>
                        عذراً، لم نتمكن من العثور على بيانات الموظف المطلوب. قد يكون قد تم حذفه من النظام أو أن الرابط غير صحيح.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="secondary" onClick={() => router.push('/hr/employees')}>
                            <i className="fas fa-arrow-right" style={{ marginLeft: '0.5rem' }}></i>
                            العودة لقائمة الموظفين
                        </Button>
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            <i className="fas fa-sync" style={{ marginLeft: '0.5rem' }}></i>
                            إعادة المحاولة
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout >

            <div className="settings-wrapper animate-fade">
                <TabNavigation
                    tabs={[
                        { key: "info", label: "البيانات الأساسية", icon: "fa-user" },
                        { key: "documents", label: "المستندات والملفات", icon: "fa-folder-open" },
                        { key: "financial", label: "البدلات والاستقطاعات", icon: "fa-coins" },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div style={{ marginTop: '1.5rem' }}>
                    {activeTab === 'info' && <BasicInfoTab employee={employee} />}
                    {activeTab === 'documents' && <DocumentsTab id={id} employee={employee} />}
                    {activeTab === 'financial' && <FinancialTab employee={employee} />}
                </div>
            </div>
        </MainLayout>
    );
}
