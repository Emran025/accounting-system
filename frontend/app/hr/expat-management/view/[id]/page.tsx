"use client";

import { MainLayout, PageSubHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Button, showToast } from "@/components/ui";
import { ExpatRecord } from "@/app/hr/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ViewExpatPage({ params }: { params: { id: string } }) {
    const [user, setUser] = useState<any>(null);
    const [record, setRecord] = useState<ExpatRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

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

    const getExpiryStatus = (expiryDate?: string) => {
        if (!expiryDate) return { class: "bg-gray-100 text-gray-800", text: "-" };
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return { class: "badge badge-danger", text: "منتهي" };
        if (daysUntilExpiry < 30) return { class: "badge badge-warning", text: `قريباً (${daysUntilExpiry} يوم)` };
        if (daysUntilExpiry < 90) return { class: "badge badge-info", text: `خلال 3 أشهر` };
        return { class: "badge badge-success", text: "صالح" };
    };

    return (
        <MainLayout >
            {isLoading ? (
                <div className="text-center p-8">جاري التحميل...</div>
            ) : record ? (
                <div className="sales-card animate-fade">
                    <PageSubHeader
                        title={`سجل الموظف: ${record.employee?.full_name}`}
                        titleIcon="globe"
                        actions={
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => router.back()}>
                                    عودة
                                </Button>
                                <Button variant="primary" onClick={() => router.push(`/hr/expat-management/edit/${record.id}`)} icon="edit">
                                    تعديل
                                </Button>
                            </div>
                        }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 h-full">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">المعلومات الأساسية</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الموظف:</span>
                                        <span className="font-medium">{record.employee?.full_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">الكود:</span>
                                        <span className="font-medium">{record.employee?.employee_code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">البلد المضيف:</span>
                                        <span className="font-medium">{record.host_country}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">البلد الأم:</span>
                                        <span className="font-medium">{record.home_country || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ العودة:</span>
                                        <span className="font-medium">{record.repatriation_date ? formatDate(record.repatriation_date) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 h-full">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">البدلات المالية</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">تسوية غلاء المعيشة:</span>
                                        <span className="font-bold text-primary">{formatCurrency(record.cost_of_living_adjustment || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">بدل السكن:</span>
                                        <span className="font-bold text-primary">{formatCurrency(record.housing_allowance || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">حزمة الانتقال:</span>
                                        <span className="font-bold text-primary">{formatCurrency(record.relocation_package || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">معادلة الضرائب:</span>
                                        <span className={`badge ${record.tax_equalization ? 'badge-success' : 'badge-secondary'}`}>
                                            {record.tax_equalization ? 'نعم' : 'لا'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="font-semibold text-lg mb-3 pb-2 border-b">الوثائق والإقامات</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                            <div>
                                                <div className="text-xs text-secondary">جواز السفر</div>
                                                <div className="font-mono">{record.passport_number || '-'}</div>
                                            </div>
                                            {record.passport_expiry && (
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">الانتهاء: {formatDate(record.passport_expiry)}</div>
                                                    <span className={getExpiryStatus(record.passport_expiry).class}>{getExpiryStatus(record.passport_expiry).text}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                            <div>
                                                <div className="text-xs text-secondary">تأشيرة الدخول</div>
                                                <div className="font-mono">{record.visa_number || '-'}</div>
                                            </div>
                                            {record.visa_expiry && (
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">الانتهاء: {formatDate(record.visa_expiry)}</div>
                                                    <span className={getExpiryStatus(record.visa_expiry).class}>{getExpiryStatus(record.visa_expiry).text}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                            <div>
                                                <div className="text-xs text-secondary">الإقامة</div>
                                                <div className="font-mono">{record.residency_number || '-'}</div>
                                            </div>
                                            {record.residency_expiry && (
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">الانتهاء: {formatDate(record.residency_expiry)}</div>
                                                    <span className={getExpiryStatus(record.residency_expiry).class}>{getExpiryStatus(record.residency_expiry).text}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                            <div>
                                                <div className="text-xs text-secondary">تصريح العمل</div>
                                                <div className="font-mono">{record.work_permit_number || '-'}</div>
                                            </div>
                                            {record.work_permit_expiry && (
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">الانتهاء: {formatDate(record.work_permit_expiry)}</div>
                                                    <span className={getExpiryStatus(record.work_permit_expiry).class}>{getExpiryStatus(record.work_permit_expiry).text}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {record.notes && (
                            <div className="md:col-span-2">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h3 className="font-semibold text-lg mb-3 pb-2 border-b">ملاحظات</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-red-500 p-8">عذراً، لم يتم العثور على السجل المطلوب.</div>
            )}
        </MainLayout>
    );
}
