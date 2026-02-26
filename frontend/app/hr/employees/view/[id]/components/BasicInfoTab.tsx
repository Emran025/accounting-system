"use client";

import { useRouter } from "next/navigation";
import { PageSubHeader } from "@/components/layout";
import { Employee } from "../../../../types";
import { Label, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/lib/utils";

interface BasicInfoTabProps {
    employee: Employee;
}

export default function BasicInfoTab({ employee }: BasicInfoTabProps) {
    const router = useRouter();
    const { canAccess } = useAuthStore();

    return (
        <div className="sales-card animate-fade">
            <div className="settings-wrapper animate-fade">
                <PageSubHeader
                    title="بيانات الموظف الأساسية"
                    titleIcon="user-circle"
                    actions={
                        <div className="flex gap-2">
                            {canAccess("employees", "edit") && (
                                <Button variant="primary" icon="edit" onClick={() => router.push(`/hr/employees/edit/${employee.id}`)}> تعديل البيانات</Button>
                            )}
                        </div>
                    }
                />

                {/* Personal Info */}
                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                        <i className="fas fa-user-circle fa-lg"></i>
                        <h4 style={{ margin: 0 }}>المعلومات الشخصية</h4>
                    </div>
                    <div className="info-grid">
                        <div>
                            <Label className="text-muted">الاسم الكامل</Label>
                            <div className="fw-bold">{employee.full_name}</div>
                        </div>
                        <div>
                            <Label className="text-muted">البريد الإلكتروني</Label>
                            <div>{employee.email}</div>
                        </div>
                        <div>
                            <Label className="text-muted">الهوية / الإقامة</Label>
                            <div>{employee.national_id || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">تاريخ الميلاد</Label>
                            <div>{employee.date_of_birth || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">الجنس</Label>
                            <div>{employee.gender === 'male' ? 'ذكر' : employee.gender === 'female' ? 'أنثى' : '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">رقم الهاتف</Label>
                            <div dir="ltr" style={{ textAlign: 'right' }}>{employee.phone || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">العنوان</Label>
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
                    <div className="info-grid">
                        <div>
                            <Label className="text-muted">الرقم الوظيفي</Label>
                            <div className="fw-bold">{employee.employee_code}</div>
                        </div>
                        <div>
                            <Label className="text-muted">المسمى الوظيفي</Label>
                            <div>{employee.role?.role_name_ar || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">القسم</Label>
                            <div>{employee.department?.name_ar || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">تاريخ التعيين</Label>
                            <div>{employee.hire_date}</div>
                        </div>
                        <div>
                            <Label className="text-muted">نوع العقد</Label>
                            <div>{employee.contract_type === 'full_time' ? 'دوام كامل' : employee.contract_type === 'part_time' ? 'دوام جزئي' : employee.contract_type === 'contract' ? 'عقد محدد' : 'عمل حر'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">الحالة</Label>
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
                    <div className="info-grid">
                        <div>
                            <Label className="text-muted">الراتب الأساسي</Label>
                            <div className="fw-bold text-success">{formatCurrency(employee.base_salary)}</div>
                        </div>
                        <div>
                            <Label className="text-muted">رقم التأمينات (GOSI)</Label>
                            <div>{employee.gosi_number || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">اسم البنك</Label>
                            <div>{employee.bank_name || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">الآيبان (IBAN)</Label>
                            <div style={{ fontFamily: 'monospace' }}>{employee.iban || '-'}</div>
                        </div>
                        <div>
                            <Label className="text-muted">رصيد الإجازات</Label>
                            <div>{employee.vacation_days_balance} يوم</div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
            `}</style>
        </div>
    );
}
