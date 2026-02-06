"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser, User } from "@/lib/auth";
import { fetchAPI, formatCurrency } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Employee } from "../../../types";

export default function ViewEmployeePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUser(getStoredUser());
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.withId(params.id));
            setEmployee(res.data as Employee || res as unknown as Employee);
        } catch (e) {
            console.error("Failed to load employee", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-5 text-center">جاري التحميل...</div>;
    if (!employee) return <div className="p-5 text-center">الموظف غير موجود</div>;

    return (
        <ModuleLayout groupKey="hr" requiredModule="hr">
            <PageHeader title={`ملف الموظف: ${employee.full_name}`} user={user} showDate={true} />

            <div className="settings-wrapper animate-fade">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => router.push(`/hr/employees/edit/${employee.id}`)}>
                        <i className="fas fa-edit"></i> تعديل البيانات
                    </button>
                </div>

                {/* Personal Info */}
                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                        <i className="fas fa-user-circle fa-lg"></i>
                        <h4 style={{ margin: 0 }}>المعلومات الشخصية</h4>
                    </div>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="text-muted">الاسم الكامل</label>
                            <div className="fw-bold">{employee.full_name}</div>
                        </div>
                        <div>
                            <label className="text-muted">البريد الإلكتروني</label>
                            <div>{employee.email}</div>
                        </div>
                        <div>
                            <label className="text-muted">الهوية / الإقامة</label>
                            <div>{employee.national_id || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">تاريخ الميلاد</label>
                            <div>{employee.date_of_birth || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">الجنس</label>
                            <div>{employee.gender === 'male' ? 'ذكر' : employee.gender === 'female' ? 'أنثى' : '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">رقم الهاتف</label>
                            <div dir="ltr" style={{ textAlign: 'right' }}>{employee.phone || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">العنوان</label>
                            <div>{employee.address || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Employment Info */}
                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                        <i className="fas fa-briefcase fa-lg"></i>
                        <h4 style={{ margin: 0 }}>معلومات التوظيف</h4>
                    </div>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="text-muted">الرقم الوظيفي</label>
                            <div className="fw-bold">{employee.employee_code}</div>
                        </div>
                        <div>
                            <label className="text-muted">المسمى الوظيفي</label>
                            <div>{employee.role?.role_name_ar || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">القسم</label>
                            <div>{employee.department?.name_ar || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">تاريخ التعيين</label>
                            <div>{employee.hire_date}</div>
                        </div>
                        <div>
                            <label className="text-muted">نوع العقد</label>
                            <div>{employee.contract_type === 'full_time' ? 'دوام كامل' : employee.contract_type === 'part_time' ? 'دوام جزئي' : employee.contract_type === 'contract' ? 'عقد محدد' : 'عمل حر'}</div>
                        </div>
                        <div>
                            <label className="text-muted">الحالة</label>
                            <div>
                                <span className={`badge ${employee.employment_status === 'active' ? 'badge-success' : employee.employment_status === 'suspended' ? 'badge-warning' : 'badge-danger'}`}>
                                    {employee.employment_status === 'active' ? 'نشط' : employee.employment_status === 'suspended' ? 'معلق' : 'منهي خدماته'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Info */}
                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                        <i className="fas fa-money-check-alt fa-lg"></i>
                        <h4 style={{ margin: 0 }}>المعلومات المالية</h4>
                    </div>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="text-muted">الراتب الأساسي</label>
                            <div className="fw-bold text-success">{formatCurrency(employee.base_salary)}</div>
                        </div>
                        <div>
                            <label className="text-muted">رقم التأمينات (GOSI)</label>
                            <div>{employee.gosi_number || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">اسم البنك</label>
                            <div>{employee.bank_name || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">الآيبان (IBAN)</label>
                            <div style={{ fontFamily: 'monospace' }}>{employee.iban || '-'}</div>
                        </div>
                        <div>
                            <label className="text-muted">رصيد الإجازات</label>
                            <div>{employee.vacation_days_balance} يوم</div>
                        </div>
                    </div>
                </div>
            </div>
        </ModuleLayout>
    );
}
