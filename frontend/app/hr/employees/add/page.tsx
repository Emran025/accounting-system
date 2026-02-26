"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { getStoredUser, User } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Role, Department } from "../../types";
import { Label, Select, TextInput, EmailInput, PasswordInput, Button } from "@/components/ui";

/**
 * Add Employee Page Component.
 * Comprehensive form for creating new employee records with:
 * - Personal information (name, ID, contact details)
 * - Employment details (role, department, contract type, manager)
 * - Financial information (salary, GOSI, bank details, vacation balance)
 * - Portal credentials for self-service access
 * 
 * Integrates with EmployeesController API for employee creation.
 * 
 * @returns The AddEmployeePage component
 */
export default function AddEmployeePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); // Using any for simplicity or import Employee type

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
        vacation_days_balance: '0',
        manager_id: ''
    });

    useEffect(() => {
        setUser(getStoredUser());
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const [rolesRes, deptsRes, empsRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.SYSTEM.USERS.ROLES),
                fetchAPI(API_ENDPOINTS.HR.DEPARTMENTS),
                fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE) // Fetch potential managers
            ]);
            setRoles(rolesRes.data as Role[] || (Array.isArray(rolesRes) ? rolesRes : []));
            setDepartments(deptsRes.data as Department[] || (Array.isArray(deptsRes) ? deptsRes : []));
            setEmployees(empsRes.data as any[] || (Array.isArray(empsRes) ? empsRes : []));
        } catch (e) {
            console.error("Failed to load options", e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE, {
                method: 'POST',
                body: JSON.stringify(formData),
            });

            if (res.success !== false) {
                alert('تم إضافة الموظف بنجاح');
                router.push('/hr');
            } else {
                alert('فشل إضافة الموظف: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            alert('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainLayout >
            <div className="settings-wrapper animate-fade">
                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                            <i className="fas fa-user-circle fa-lg"></i>
                            <h4 style={{ margin: 0 }}>المعلومات الشخصية</h4>
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <TextInput label="الاسم الكامل" name="full_name" required value={formData.full_name} onChange={handleChange} placeholder="الاسم رباعي" />
                            <TextInput label="رقم الهوية / الإقامة" name="national_id" value={formData.national_id} onChange={handleChange} placeholder="10xxxxxxxxx" />
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
                            <TextInput label="رقم الهاتف" name="phone" value={formData.phone} onChange={handleChange} placeholder="05xxxxxxxx" />
                            <TextInput label="العنوان" name="address" value={formData.address} onChange={handleChange} placeholder="المدينة، الحي، الشارع" />
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
                                placeholder="اختر المسمى الوظيفي (الدور)"
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
                            <TextInput label="تاريخ المباشرة" type="date" name="hire_date" required value={formData.hire_date} onChange={handleChange} />
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
                            <TextInput label="رقم التأمينات الاجتماعية (GOSI)" name="gosi_number" value={formData.gosi_number} onChange={handleChange} />
                            <TextInput label="اسم البنك" name="bank_name" value={formData.bank_name} onChange={handleChange} />
                            <TextInput label="رقم الآيبان (IBAN)" name="iban" value={formData.iban} onChange={handleChange} placeholder="SAxxxxxxxxxxxxxxxxxxxxxx" />
                            <TextInput label="رصيد الإجازات الافتتاحي (أيام)" type="number" name="vacation_days_balance" value={formData.vacation_days_balance} onChange={handleChange} min="0" step="0.5" />
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            <Select
                                label="المدير المباشر"
                                name="manager_id"
                                value={formData.manager_id}
                                onChange={handleChange}
                                placeholder="اختر المدير المباشر"
                                options={employees.map(emp => ({ value: emp.id, label: emp.full_name }))}
                            />
                        </div>
                    </div>

                    {/* Account Credentials */}
                    <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                            <i className="fas fa-lock fa-lg"></i>
                            <h4 style={{ margin: 0 }}>بيانات الدخول للبوابة</h4>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>تستخدم هذه البيانات لدخول الموظف إلى بوابة الخدمات الذاتية.</p>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <EmailInput label="البريد الإلكتروني" name="email" required value={formData.email} onChange={handleChange} />
                            <PasswordInput label="كلمة المرور" name="password" required value={formData.password} onChange={handleChange} minLength={6} placeholder="********" />
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <Button variant="secondary" onClick={() => router.back()}>إلغاء</Button>
                        <Button type="submit" isLoading={isLoading} icon="save">
                            حفظ الموظف
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
