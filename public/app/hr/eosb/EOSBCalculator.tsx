"use client";

import { useState, useEffect } from "react";
import { Dialog, showToast, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Employee } from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";

/**
 * End of Service Benefit (EOSB) Calculation result.
 * Based on Saudi Labor Law Article 84-85 for termination benefits.
 */
interface EOSBCalculation {
  years_of_service: number;
  months_of_service: number;
  days_of_service: number;
  last_gross_salary: number;
  eosb_amount: number;
  unused_vacation_amount: number;
  notice_period_amount: number;
  total_settlement: number;
  breakdown: {
    eosb: number;
    unused_vacation: number;
    notice_period: number;
  };
}

/**
 * End of Service Benefit (EOSB) Calculator Component.
 * Calculates termination benefits according to Saudi Labor Law:
 * - EOSB: Based on years of service (half month for first 5 years, full month after)
 * - Unused vacation pay: Remaining vacation balance at daily rate
 * - Notice period compensation: Based on termination reason
 * 
 * Formula varies by termination reason per Article 84-85.
 * 
 * @returns The EOSBCalculator component
 */
export function EOSBCalculator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calculation, setCalculation] = useState<EOSBCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    termination_date: new Date().toISOString().split('T')[0],
    termination_reason: "resignation" as "resignation" | "termination" | "end_of_contract"
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
      const data = res.data || (Array.isArray(res) ? res : []);
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculate = async () => {
    if (!formData.employee_id) {
      showToast("يرجى اختيار الموظف", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EOSB.PREVIEW, {
        method: 'POST',
        body: JSON.stringify({
          employee_id: formData.employee_id,
          termination_date: formData.termination_date,
          termination_reason: formData.termination_reason
        })
      });
      setCalculation(res);
      setShowDialog(true);
    } catch (e: any) {
      showToast(e.message || "فشل حساب مكافأة نهاية الخدمة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmp = employees.find(e => e.id.toString() === formData.employee_id);

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("calculator")} حاسبة مكافأة نهاية الخدمة</h3>
        </div>
      </div>

      <div className="sales-card compact" style={{ marginBottom: '1.5rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الموظف *</label>
            <SearchableSelect
              options={employees.map(emp => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={formData.employee_id}
              onChange={(value) => {
                setFormData({ ...formData, employee_id: String(value || "") });
                const emp = employees.find(e => e.id.toString() === String(value || ""));
                setSelectedEmployee(emp || null);
              }}
              placeholder="اختر الموظف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>تاريخ إنهاء الخدمة *</label>
            <TextInput
              type="date"
              value={formData.termination_date}
              onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>سبب إنهاء الخدمة *</label>
            <Select
              value={formData.termination_reason}
              onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value as any })}
            >
              <option value="resignation">استقالة</option>
              <option value="termination">إنهاء من قبل صاحب العمل</option>
              <option value="end_of_contract">انتهاء العقد</option>
            </Select>
          </div>
        </div>

        {selectedEmp && (
          <div className="sales-card compact" style={{ marginTop: '1.5rem', background: 'var(--primary-subtle)', border: '1px solid var(--primary-light)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="stat-item">
                <span className="stat-label">تاريخ التوظيف</span>
                <span className="stat-value" style={{ fontSize: '0.95rem' }}>{formatDate(selectedEmp.hire_date)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">الراتب الأساسي</span>
                <span className="stat-value" style={{ fontSize: '0.95rem' }}>{formatCurrency(selectedEmp.base_salary)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">رصيد الإجازات</span>
                <span className="stat-value" style={{ fontSize: '0.95rem' }}>{selectedEmp.vacation_days_balance} يوم</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">حالة التوظيف</span>
                <span className="stat-value" style={{ fontSize: '0.95rem' }}>
                  {selectedEmp.employment_status === 'active' ? 'نشط' :
                    selectedEmp.employment_status === 'suspended' ? 'موقوف' : 'منتهي'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleCalculate}
            disabled={isLoading || !formData.employee_id}
            variant="primary"
            icon="calculator">
            حساب مكافأة نهاية الخدمة
          </Button>
        </div>
      </div>

      <Dialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title="نتيجة حساب مكافأة نهاية الخدمة"
        maxWidth="700px"
      >
        {calculation && (
          <div className="space-y-4">
            <div className="sales-card compact" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-item">
                  <span className="stat-label">سنوات الخدمة</span>
                  <span className="stat-value">{calculation.years_of_service} سنة</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">أشهر الخدمة</span>
                  <span className="stat-value">{calculation.months_of_service} شهر</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">أيام الخدمة</span>
                  <span className="stat-value">{calculation.days_of_service} يوم</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">آخر راتب إجمالي</span>
                  <span className="stat-value">{formatCurrency(calculation.last_gross_salary)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>تفاصيل الحساب:</h4>
              <div className="sales-card compact">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3" style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>مكافأة نهاية الخدمة:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(calculation.eosb_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3" style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>رصيد الإجازات غير المستخدم:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(calculation.unused_vacation_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3" style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>مبلغ فترة الإشعار:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(calculation.notice_period_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sales-card compact" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', border: '2px solid #10b981' }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>إجمالي التسوية:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>
                  {formatCurrency(calculation.total_settlement)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  showToast("تم حفظ الحساب", "success");
                }}
                variant="primary"
                icon="save">
                حفظ
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
