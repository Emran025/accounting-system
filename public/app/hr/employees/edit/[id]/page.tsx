"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser, User } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Role, Department, Employee } from "../../../types";
import { TabNavigation, Select, TextInput, EmailInput, PasswordInput, Button } from "@/components/ui";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("info");
    const [isLoading, setIsLoading] = useState(true);
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [formData, setFormData] = useState({
        full_name: '',
        employee_code: '',
        email: '',
        password: '',
        phone: '',
        national_id: '',
        gosi_number: '',
        date_of_birth: '',
        gender: 'male',
        address: '',
        role_id: '',
        department_id: '',
        hire_date: '',
        base_salary: '',
        iban: '',
        bank_name: '',
        employment_status: 'active',
        contract_type: 'full_time',
        vacation_days_balance: 0
    });

    useEffect(() => {
        setUser(getStoredUser());
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [rolesRes, deptsRes, empRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.SYSTEM.USERS.ROLES),
                fetchAPI(API_ENDPOINTS.HR.DEPARTMENTS),
                fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.withId(id))
            ]);

            setRoles(rolesRes.data as Role[] || (Array.isArray(rolesRes) ? rolesRes : []));
            setDepartments(deptsRes.data as Department[] || (Array.isArray(deptsRes) ? deptsRes : []));

            const emp = empRes.data as any || empRes;

            // Populate form
            setFormData({
                full_name: emp.full_name,
                employee_code: emp.employee_code,
                email: emp.email,
                password: '',
                phone: emp.phone || '',
                national_id: emp.national_id || '',
                gosi_number: emp.gosi_number || '',
                date_of_birth: emp.date_of_birth || '',
                gender: emp.gender || 'male',
                address: emp.address || '',
                role_id: emp.role_id || '',
                department_id: emp.department_id || '',
                hire_date: emp.hire_date,
                base_salary: emp.base_salary,
                iban: emp.iban || '',
                bank_name: emp.bank_name || '',
                employment_status: emp.employment_status,
                contract_type: emp.contract_type || 'full_time',
                vacation_days_balance: emp.vacation_days_balance || 0
            });
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.withId(id), {
                method: 'PUT',
                body: JSON.stringify(formData),
            });

            if (res.success !== false) {
                alert('تم تحديث بيانات الموظف بنجاح');
            } else {
                alert('فشل التحديث: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            alert('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-5 text-center">جاري التحميل...</div>;

    return (
        <ModuleLayout groupKey="hr" requiredModule="hr">
            <PageHeader title="تعديل بيانات الموظف" user={user} showDate={true} />

            <div className="settings-wrapper animate-fade">
                <TabNavigation
                    tabs={[
                        { key: "info", label: "البيانات الأساسية", icon: "fa-user" },
                        { key: "documents", label: "المستندات", icon: "fa-file" },
                        { key: "financial", label: "البدلات والاستقطاعات", icon: "fa-coins" },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div style={{ marginTop: '1.5rem' }}>
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit}>
                            {/* Personal Information */}
                            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                    <i className="fas fa-user-circle fa-lg"></i>
                                    <h4 style={{ margin: 0 }}>المعلومات الشخصية</h4>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <TextInput label="الاسم الكامل" name="full_name" required value={formData.full_name} onChange={handleChange} />
                                    <TextInput label="رقم الهوية / الإقامة" name="national_id" value={formData.national_id} onChange={handleChange} />
                                    <TextInput label="تاريخ الميلاد" type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
                                    <Select
                                        label="الجنس"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'male', label: 'ذكر' },
                                            { value: 'female', label: 'أنثى' }
                                        ]}
                                    />
                                    <TextInput label="رقم الهاتف" name="phone" value={formData.phone} onChange={handleChange} />
                                    <TextInput label="العنوان" name="address" value={formData.address} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Employment Information */}
                            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                    <i className="fas fa-briefcase fa-lg"></i>
                                    <h4 style={{ margin: 0 }}>معلومات التوظيف</h4>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <TextInput label="الرقم الوظيفي" name="employee_code" required value={formData.employee_code} onChange={handleChange} />
                                    <Select
                                        label="المسمى الوظيفي"
                                        name="role_id"
                                        value={formData.role_id}
                                        onChange={handleChange}
                                        placeholder="اختر المسمى الوظيفي"
                                        options={roles.map(role => ({ value: role.id, label: role.role_name_ar }))}
                                    />
                                    <Select
                                        label="القسم"
                                        name="department_id"
                                        value={formData.department_id}
                                        onChange={handleChange}
                                        placeholder="اختر القسم"
                                        options={departments.map(dept => ({ value: dept.id, label: dept.name_ar }))}
                                    />
                                    <TextInput label="تاريخ التعيين" type="date" name="hire_date" required value={formData.hire_date} onChange={handleChange} />
                                    <Select
                                        label="نوع العقد"
                                        name="contract_type"
                                        value={formData.contract_type}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'full_time', label: 'دوام كامل' },
                                            { value: 'part_time', label: 'دوام جزئي' },
                                            { value: 'contract', label: 'عقد محدد المدة' },
                                            { value: 'freelance', label: 'تعاون / عمل حر' }
                                        ]}
                                    />
                                    <Select
                                        label="حالة التوظيف"
                                        name="employment_status"
                                        value={formData.employment_status}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'active', label: 'نشط' },
                                            { value: 'suspended', label: 'معلق' },
                                            { value: 'terminated', label: 'منهي خدماته' }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                    <i className="fas fa-money-check-alt fa-lg"></i>
                                    <h4 style={{ margin: 0 }}>المعلومات المالية</h4>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <TextInput label="الراتب الأساسي" type="number" name="base_salary" required value={formData.base_salary} onChange={handleChange} min="0" step="0.01" />
                                    <TextInput label="رقم التأمينات (GOSI)" name="gosi_number" value={formData.gosi_number} onChange={handleChange} />
                                    <TextInput label="اسم البنك" name="bank_name" value={formData.bank_name} onChange={handleChange} />
                                    <TextInput label="رقم الآيبان (IBAN)" name="iban" value={formData.iban} onChange={handleChange} />
                                    <TextInput label="رصيد الإجازات" type="number" name="vacation_days_balance" value={formData.vacation_days_balance} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Portal Credentials */}
                            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                    <i className="fas fa-lock fa-lg"></i>
                                    <h4 style={{ margin: 0 }}>تحديث بيانات الدخول</h4>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <EmailInput label="البريد الإلكتروني" name="email" required value={formData.email} onChange={handleChange} />
                                    <PasswordInput label="كلمة المرور الجديدة" name="password" value={formData.password} onChange={handleChange} minLength={6} placeholder="اتركه فارغاً إذا لم ترغب بالتغيير" />
                                </div>
                            </div>

                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => router.push('/hr')}>إلغاء</Button>
                                <Button type="submit">حفظ التعديلات</Button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'documents' && (
                        <div className="sales-card p-4">
                            <h3>المستندات</h3>
                            <p>سيتم تفعيل رفع المستندات قريباً.</p>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="sales-card p-4">
                            <h3>البدلات والاستقطاعات</h3>
                            <p>سيتم تفعيل إدارة البدلات قريباً.</p>
                        </div>
                    )}
                </div>
            </div>
        </ModuleLayout>
    );
}
