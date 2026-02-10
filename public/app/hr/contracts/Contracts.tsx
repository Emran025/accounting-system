"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface EmployeeContract {
    id: number;
    employee_id: number;
    contract_number: string;
    contract_start_date: string;
    contract_end_date?: string;
    probation_end_date?: string;
    base_salary: number;
    contract_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
    is_current: boolean;
    employee?: {
        full_name: string;
        employee_code: string;
    };
    notes?: string;
}

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
                <div className="action-buttons">
                    <button
                        className="icon-btn view"
                        onClick={() => router.push(`/hr/contracts/view/${item.id}`)}
                        title="عرض التفاصيل"
                    >
                        <i className="fas fa-eye"></i>
                    </button>
                    <button
                        className="icon-btn edit"
                        onClick={() => router.push(`/hr/contracts/edit/${item.id}`)}
                        title="تعديل"
                    >
                        <i className="fas fa-edit"></i>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>{getIcon("file-contract")} العقود والاتفاقيات</h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                    <Button
                        onClick={() => router.push('/hr/contracts/add')}
                        className="btn-primary"
                    >
                        <i className="fas fa-plus"></i> إضافة عقد
                    </Button>
                </div>
            </div>

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
