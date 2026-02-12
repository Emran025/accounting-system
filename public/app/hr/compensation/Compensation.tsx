"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { useAuthStore } from "@/stores/useAuthStore";
import { getIcon } from "@/lib/icons";

interface CompensationPlan {
    id: number;
    plan_name: string;
    plan_type: string;
    fiscal_year: string;
    effective_date: string;
    status: string;
    budget_pool: number;
    allocated_amount: number;
}

interface CompensationEntry {
    id: number;
    employee?: { full_name: string };
    current_salary: number;
    proposed_salary: number;
    increase_amount: number;
    increase_percentage: number;
    comp_ratio?: number;
    status: string;
}

const planTypeLabels: Record<string, string> = {
    merit: "استحقاق",
    promotion: "ترقية",
    adjustment: "تعديل",
    bonus: "مكافأة",
    commission: "عمولة",
};

const statusLabels: Record<string, string> = {
    draft: "مسودة",
    pending_approval: "قيد الموافقة",
    approved: "موافق عليه",
    active: "نشط",
    closed: "مغلق",
    pending: "قيد الانتظار",
    rejected: "مرفوض",
    processed: "معالج",
};

const statusBadges: Record<string, string> = {
    draft: "badge-secondary",
    pending_approval: "badge-warning",
    approved: "badge-success",
    active: "badge-success",
    closed: "badge-secondary",
    pending: "badge-warning",
    rejected: "badge-danger",
    processed: "badge-info",
};

export function Compensation() {
    const router = useRouter();
    const { canAccess } = useAuthStore();
    const [activeTab, setActiveTab] = useState("plans");
    const [plans, setPlans] = useState<CompensationPlan[]>([]);
    const [entries, setEntries] = useState<CompensationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (activeTab === "plans") {
            loadPlans();
        } else {
            loadEntries();
        }
    }, [activeTab, currentPage]);

    const loadPlans = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams({
                page: currentPage.toString(),
            });
            const res = await fetchAPI(`${API_ENDPOINTS.HR.COMPENSATION.PLANS.BASE}?${query}`);
            setPlans(res.data as CompensationPlan[] || []);
            setTotalPages(Number(res.last_page) || 1);
        } catch (error) {
            console.error("Failed to load plans", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams({
                page: currentPage.toString(),
            });
            const res = await fetchAPI(`${API_ENDPOINTS.HR.COMPENSATION.ENTRIES.BASE}?${query}`);
            setEntries(res.data as CompensationEntry[] || []);
            setTotalPages(Number(res.last_page) || 1);
        } catch (error) {
            console.error("Failed to load entries", error);
        } finally {
            setIsLoading(false);
        }
    };

    const planColumns: Column<CompensationPlan>[] = [
        {
            key: "plan_name",
            header: "اسم الخطة",
            dataLabel: "اسم الخطة",
        },
        {
            key: "plan_type",
            header: "النوع",
            dataLabel: "النوع",
            render: (item) => planTypeLabels[item.plan_type] || item.plan_type,
        },
        {
            key: "fiscal_year",
            header: "السنة المالية",
            dataLabel: "السنة المالية",
        },
        {
            key: "budget_pool",
            header: "ميزانية الخطة",
            dataLabel: "ميزانية الخطة",
            render: (item) => formatCurrency(item.budget_pool),
        },
        {
            key: "allocated_amount",
            header: "المخصص",
            dataLabel: "المخصص",
            render: (item) => formatCurrency(item.allocated_amount),
        },
        {
            key: "status",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${statusBadges[item.status] || 'badge-secondary'}`}>
                    {statusLabels[item.status] || item.status}
                </span>
            ),
        },
        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "عرض التفاصيل",
                            variant: "view",
                            onClick: () => router.push(`/hr/compensation/plans/${item.id}`)
                        },
                        ...(canAccess("compensation", "edit") ? [{
                            icon: "edit" as const,
                            title: "تعديل",
                            variant: "edit" as const,
                            onClick: () => router.push(`/hr/compensation/plans/edit/${item.id}`)
                        }] : [])
                    ]}
                />
            ),
        },
    ];

    const entryColumns: Column<CompensationEntry>[] = [
        {
            key: "employee",
            header: "الموظف",
            dataLabel: "الموظف",
            render: (item) => item.employee?.full_name || '-',
        },
        {
            key: "current_salary",
            header: "الراتب الحالي",
            dataLabel: "الراتب الحالي",
            render: (item) => formatCurrency(item.current_salary),
        },
        {
            key: "proposed_salary",
            header: "الراتب المقترح",
            dataLabel: "الراتب المقترح",
            render: (item) => formatCurrency(item.proposed_salary),
        },
        {
            key: "increase_amount",
            header: "مقدار الزيادة",
            dataLabel: "مقدار الزيادة",
            render: (item) => (
                <span className={item.increase_amount > 0 ? 'text-success' : 'text-danger'}>
                    {formatCurrency(item.increase_amount)}
                </span>
            ),
        },
        {
            key: "increase_percentage",
            header: "نسبة الزيادة",
            dataLabel: "نسبة الزيادة",
            render: (item) => `${item.increase_percentage}%`,
        },
        {
            key: "comp_ratio",
            header: "نسبة التعويض",
            dataLabel: "نسبة التعويض",
            render: (item) => item.comp_ratio ? item.comp_ratio.toFixed(2) : '-',
        },
        {
            key: "status",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${statusBadges[item.status] || 'badge-secondary'}`}>
                    {statusLabels[item.status] || item.status}
                </span>
            ),
        },
        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "عرض التفاصيل",
                            variant: "view",
                            onClick: () => router.push(`/hr/compensation/entries/${item.id}`)
                        },
                        ...(canAccess("compensation", "edit") ? [{
                            icon: "edit" as const,
                            title: "تعديل",
                            variant: "edit" as const,
                            onClick: () => router.push(`/hr/compensation/entries/edit/${item.id}`)
                        }] : [])
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="إدارة التعويضات"
                titleIcon="money-bill-wave"
                actions={
                    <>
                        {activeTab === "plans" && canAccess("compensation", "create") && (
                            <Button
                                onClick={() => router.push('/hr/compensation/plans/add')}
                                variant="primary"
                                icon="plus"
                            >
                                خطة تعويضات جديدة
                            </Button>
                        )}
                        {activeTab === "entries" && canAccess("compensation", "create") && (
                            <Button
                                onClick={() => router.push('/hr/compensation/entries/add')}
                                variant="primary"
                                icon="plus"
                            >
                                إدخال تعويض جديد
                            </Button>
                        )}
                    </>
                }
            />

            <TabNavigation
                tabs={[
                    { key: "plans", label: "خطط التعويضات", icon: "file-alt" },
                    { key: "entries", label: "إدخالات التعويضات", icon: "list" },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {activeTab === "plans" ? (
                <Table
                    columns={planColumns}
                    data={plans}
                    keyExtractor={(item) => item.id.toString()}
                    emptyMessage="لا توجد خطط تعويضات"
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: setCurrentPage,
                    }}
                />
            ) : (
                <Table
                    columns={entryColumns}
                    data={entries}
                    keyExtractor={(item) => item.id.toString()}
                    emptyMessage="لا توجد إدخالات تعويضات"
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: setCurrentPage,
                    }}
                />
            )}
        </div>
    );
}


