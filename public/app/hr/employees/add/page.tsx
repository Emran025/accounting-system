"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout, PageHeader } from "@/components/layout";
import { getStoredUser, User } from "@/lib/auth";
import { Role, Department } from "../../types";

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
            fetch('/api/roles'),
            fetch('/api/departments'),
            fetch('/api/employees') // Fetch potential managers
        ]);
        const rolesData = await rolesRes.json();
        const deptsData = await deptsRes.json();
        const empsData = await empsRes.json();
        setRoles(rolesData.data || rolesData); 
        setDepartments(deptsData.data || deptsData);
        setEmployees(empsData.data || empsData);
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
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('تم إضافة الموظف بنجاح');
        router.push('/hr');
      } else {
        const err = await res.json();
        alert('فشل إضافة الموظف: ' + (err.message || JSON.stringify(err)));
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout requiredModule="hr">
      <PageHeader title="إضافة موظف جديد" user={user} showDate={true} />
      
      <div className="settings-wrapper animate-fade">
        <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <i className="fas fa-user-circle fa-lg"></i>
                    <h4 style={{ margin: 0 }}>المعلومات الشخصية</h4>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label>الاسم الكامل <span className="text-danger">*</span></label>
                        <input type="text" name="full_name" className="form-control" required value={formData.full_name} onChange={handleChange} placeholder="الاسم رباعي" />
                    </div>
                    <div className="form-group">
                        <label>رقم الهوية / الإقامة</label>
                        <input type="text" name="national_id" className="form-control" value={formData.national_id} onChange={handleChange} placeholder="10xxxxxxxxx" />
                    </div>
                    <div className="form-group">
                        <label>تاريخ الميلاد</label>
                        <input type="date" name="date_of_birth" className="form-control" value={formData.date_of_birth} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>الجنس</label>
                        <select name="gender" className="form-control" value={formData.gender} onChange={handleChange}>
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>رقم الهاتف</label>
                        <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleChange} placeholder="05xxxxxxxx" />
                    </div>
                    <div className="form-group">
                        <label>العنوان</label>
                        <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} placeholder="المدينة، الحي، الشارع" />
                    </div>
                </div>
            </div>

            {/* Employment Information */}
            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <i className="fas fa-briefcase fa-lg"></i>
                    <h4 style={{ margin: 0 }}>معلومات التوظيف</h4>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label>الرقم الوظيفي <span className="text-danger">*</span></label>
                        <input type="text" name="employee_code" className="form-control" required value={formData.employee_code} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>المسمى الوظيفي</label>
                        <select name="role_id" className="form-control" value={formData.role_id} onChange={handleChange}>
                            <option value="">اختر المسمى الوظيفي (الدور)</option>
                            {roles.map(role => <option key={role.id} value={role.id}>{role.role_name_ar}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>القسم</label>
                        <select name="department_id" className="form-control" value={formData.department_id} onChange={handleChange}>
                            <option value="">اختر القسم</option>
                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name_ar}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>تاريخ المباشرة <span className="text-danger">*</span></label>
                        <input type="date" name="hire_date" className="form-control" required value={formData.hire_date} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>نوع العقد</label>
                        <select name="contract_type" className="form-control" value={formData.contract_type} onChange={handleChange}>
                            <option value="full_time">دوام كامل</option>
                            <option value="part_time">دوام جزئي</option>
                            <option value="contract">عقد محدد المدة</option>
                            <option value="freelance">تعاون / عمل حر</option>
                        </select>
                    </div>
                     <div className="form-group">
                        <label>حالة التوظيف</label>
                        <select name="employment_status" className="form-control" value={formData.employment_status} onChange={handleChange}>
                            <option value="active">نشط</option>
                            <option value="suspended">معلق</option>
                            <option value="terminated">منهي خدماته</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Financial Information */}
            <div className="section-card sales-card mb-4" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <i className="fas fa-money-check-alt fa-lg"></i>
                    <h4 style={{ margin: 0 }}>المعلومات المالية</h4>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label>الراتب الأساسي <span className="text-danger">*</span></label>
                        <input type="number" name="base_salary" className="form-control" required value={formData.base_salary} onChange={handleChange} min="0" step="0.01" />
                    </div>
                    <div className="form-group">
                        <label>رقم التأمينات الاجتماعية (GOSI)</label>
                        <input type="text" name="gosi_number" className="form-control" value={formData.gosi_number} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>اسم البنك</label>
                        <input type="text" name="bank_name" className="form-control" value={formData.bank_name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>رقم الآيبان (IBAN)</label>
                        <input type="text" name="iban" className="form-control" value={formData.iban} onChange={handleChange} placeholder="SAxxxxxxxxxxxxxxxxxxxxxx" />
                    </div>
                    <div className="form-group">
                        <label>رصيد الإجازات الافتتاحي (أيام)</label>
                        <input type="number" name="vacation_days_balance" className="form-control" value={formData.vacation_days_balance} onChange={handleChange} min="0" step="0.5" />
                    </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                        <label>المدير المباشر</label>
                        <select name="manager_id" className="form-control" value={formData.manager_id} onChange={handleChange}>
                            <option value="">اختر المدير المباشر</option>
                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                        </select>
                    </div>
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
                    <div className="form-group">
                        <label>البريد الإلكتروني <span className="text-danger">*</span></label>
                        <input type="email" name="email" className="form-control" required value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>كلمة المرور <span className="text-danger">*</span></label>
                        <input type="password" name="password" className="form-control" required value={formData.password} onChange={handleChange} minLength={6} placeholder="********" />
                    </div>
                </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.back()}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    <i className="fas fa-save"></i> {isLoading ? 'جاري الحفظ...' : 'حفظ الموظف'}
                </button>
            </div>
        </form>
      </div>
    </MainLayout>
  );
}
