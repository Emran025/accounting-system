"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, SearchableSelect, ActionButtons } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { EmployeeContract } from "@/app/hr/types";

export function Contracts() {
    const router = useRouter();
    const [contracts, setContracts] = useState<EmployeeContract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadContracts();
    }, [currentPage, searchTerm]);

    const loadContracts = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams({
                page: currentPage.toString(),
                search: searchTerm,
            });
            const res = await fetchAPI(`${API_ENDPOINTS.HR.CONTRACTS.BASE}?${query}`);
            setContracts(res.data as EmployeeContract[] || []);
            setTotalPages(Number(res.last_page) || 1);
        } catch (error) {
            console.error("Failed to load contracts", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getContractTypeLabel = (type: string) => {
        switch (type) {
            case 'full_time': return 'دوام كامل';
            case 'part_time': return 'دوام جزئي';
            case 'contract': return 'عقد';
            case 'freelance': return 'عمل حر';
            default: return type;
        }
    };

    const columns: Column<EmployeeContract>[] = [
        {
            key: "employee",
            header: "الموظف",
            dataLabel: "الموظف",
            render: (item) => (
                <div>
                    <div className="font-semibold">{item.employee?.full_name || '-'}</div>
                    <small className="text-muted">{item.employee?.employee_code || ''}</small>
                </div>
            )
        },
        {
            key: "contract_number",
            header: "رقم العقد",
            dataLabel: "رقم العقد",
            render: (item) => <code className="text-primary">{item.contract_number}</code>
        },
        {
            key: "contract_start_date",
            header: "تاريخ البدء",
            dataLabel: "تاريخ البدء",
            render: (item) => formatDate(item.contract_start_date)
        },
        {
            key: "contract_end_date",
            header: "تاريخ الانتهاء",
            dataLabel: "تاريخ الانتهاء",
            render: (item) => item.contract_end_date ? formatDate(item.contract_end_date) : 'غير محدد'
        },
        {
            key: "base_salary",
            header: "الراتب الأساسي",
            dataLabel: "الراتب الأساسي",
            render: (item) => formatCurrency(item.base_salary)
        },
        {
            key: "contract_type",
            header: "نوع العقد",
            dataLabel: "نوع العقد",
            render: (item) => (
                <span className="badge badge-outline">
                    {getContractTypeLabel(item.contract_type)}
                </span>
            )
        },
        {
            key: "is_current",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => (
                <span className={`badge ${item.is_current ? 'badge-success' : 'badge-secondary'}`}>
                    {item.is_current ? 'ساري' : 'منتهي/سابق'}
                </span>
            )
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
                            onClick: () => router.push(`/hr/contracts/view/${item.id}`)
                        },
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => router.push(`/hr/contracts/edit/${item.id}`)
                        }
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="العقود والاتفاقيات"
                titleIcon="file-contract"
                searchInput={
                    <SearchableSelect
                        options={[]}
                        value={null}
                        onChange={() => { }}
                        onSearch={(val) => {
                            setSearchTerm(val);
                            setCurrentPage(1);
                        }}
                        placeholder="بحث في العقود..."
                        className="search-input"
                    />
                }
                actions={
                    <Button
                        onClick={() => router.push('/hr/contracts/add')}
                        variant="primary"
                        icon="plus"
                    >
                        إضافة عقد
                    </Button>
                }
            />

            <Table
                columns={columns}
                data={contracts}
                keyExtractor={(item) => item.id.toString()}
                emptyMessage="لا توجد عقود مسجلة"
                isLoading={isLoading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: setCurrentPage,
                }}
            />
        </div>
    );
}
