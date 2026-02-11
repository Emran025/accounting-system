"use client";

import { ModuleLayout, PageHeader, PageSubHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Button, showToast } from "@/components/ui";
import { EmployeeAsset } from "@/app/hr/types";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ViewAssetPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [asset, setAsset] = useState<EmployeeAsset | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

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

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            allocated: "مخصص",
            returned: "مسترد",
            maintenance: "صيانة",
            lost: "مفقود",
            damaged: "تالف"
        };
        return labels[status] || status;
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            allocated: "badge-success",
            returned: "badge-secondary",
            maintenance: "badge-warning",
            lost: "badge-danger",
            damaged: "badge-danger"
        };
        return badges[status] || "badge-secondary";
    };

    return (
        <ModuleLayout groupKey="hr" requiredModule="employee-assets">
            <PageHeader title="تفاصيل الأصل" user={user} showDate={true} />

            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : asset ? (
                <div className="sales-card animate-fade">
                    <PageSubHeader
                        title={`أصل: ${asset.asset_name}`}
                        titleIcon="laptop"
                        actions={
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => router.back()}>
                                    عودة
                                </Button>
                                <Button variant="primary" onClick={() => router.push(`/hr/employee-assets/edit/${asset.id}`)} icon="edit">
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
                                        <span className="font-medium">{asset.employee?.full_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الكود:</span>
                                        <span className="font-medium">{asset.employee?.employee_code}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">بيانات الأصل</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">رمز الأصل:</span>
                                        <span className="font-mono text-primary">{asset.asset_code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">النوع:</span>
                                        <span>{asset.asset_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الحالة:</span>
                                        <span className={`badge ${getStatusBadge(asset.status)}`}>
                                            {getStatusLabel(asset.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">التواريخ وتفاصيل أخرى</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ التخصيص:</span>
                                        <span>{formatDate(asset.allocation_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ الاسترداد:</span>
                                        <span>{asset.return_date ? formatDate(asset.return_date) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الصيانة القادمة:</span>
                                        <span>{asset.next_maintenance_date ? formatDate(asset.next_maintenance_date) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الرقم التسلسلي:</span>
                                        <span className="font-mono">{asset.serial_number || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">QR Code:</span>
                                        <span className="font-mono">{asset.qr_code || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {asset.notes && (
                            <div className="md:col-span-2">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h3 className="font-semibold text-lg mb-3 pb-2 border-b">ملاحظات</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-red-500 p-8">عذراً، لم يتم العثور على الأصل المطلوب.</div>
            )}
        </ModuleLayout>
    );
}
