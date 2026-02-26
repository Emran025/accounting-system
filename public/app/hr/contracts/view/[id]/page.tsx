"use client";

import { MainLayout, PageSubHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Button, showToast } from "@/components/ui";
import { EmployeeContract } from "@/app/hr/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ViewContractPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [contract, setContract] = useState<EmployeeContract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

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

    const getContractTypeLabel = (type: string) => {
        switch (type) {
            case 'full_time': return 'دوام كامل';
            case 'part_time': return 'دوام جزئي';
            case 'contract': return 'عقد';
            case 'freelance': return 'عمل حر';
            default: return type;
        }
    };

    return (
        <MainLayout >
            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : contract ? (
                <div className="sales-card animate-fade">
                    <PageSubHeader
                        title={`عقد: ${contract.contract_number}`}
                        titleIcon="file-contract"
                        actions={
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => router.back()}>
                                    عودة
                                </Button>
                                <Button variant="primary" onClick={() => router.push(`/hr/contracts/edit/${contract.id}`)} icon="edit">
                                    تعديل
                                </Button>
                            </div>
                        }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">معلومات الموظف</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الاسم:</span>
                                        <span className="font-medium">{contract.employee?.full_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الكود:</span>
                                        <span className="font-medium">{contract.employee?.employee_code}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">شروط العقد</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">نوع العقد:</span>
                                        <span className="badge badge-outline">{getContractTypeLabel(contract.contract_type)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الراتب الأساسي:</span>
                                        <span className="font-bold text-primary">{formatCurrency(contract.base_salary)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الحالة:</span>
                                        <span className={`badge ${contract.is_current ? 'badge-success' : 'badge-secondary'}`}>
                                            {contract.is_current ? 'ساري' : 'منتهي'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">التواريخ</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ البدء:</span>
                                        <span>{formatDate(contract.contract_start_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ الانتهاء:</span>
                                        <span>{contract.contract_end_date ? formatDate(contract.contract_end_date) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">نهاية فترة التجربة:</span>
                                        <span>{contract.probation_end_date ? formatDate(contract.probation_end_date) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {contract.notes && (
                            <div className="md:col-span-2">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h3 className="font-semibold text-lg mb-3 pb-2 border-b">ملاحظات</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-red-500 p-8">عذراً، لم يتم العثور على العقد المطلوب.</div>
            )}
        </MainLayout>
    );
}
