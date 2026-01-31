"use client";

import { useState, useEffect } from "react";
import { Dialog, showToast, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { Employee } from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui";

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
      const res: any = await fetchAPI('/api/employees');
      setEmployees(res.data || res || []);
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
      const res: any = await fetchAPI('/api/eosb/preview', {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">حاسبة مكافأة نهاية الخدمة</h2>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الموظف *</label>
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
            <label className="block text-sm font-medium mb-1">تاريخ إنهاء الخدمة *</label>
            <TextInput
              type="date"
              value={formData.termination_date}
              onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">سبب إنهاء الخدمة *</label>
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
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">تاريخ التوظيف:</span>
                <div className="font-medium">{formatDate(selectedEmp.hire_date)}</div>
              </div>
              <div>
                <span className="text-gray-600">الراتب الأساسي:</span>
                <div className="font-medium">{formatCurrency(selectedEmp.base_salary)}</div>
              </div>
              <div>
                <span className="text-gray-600">رصيد الإجازات:</span>
                <div className="font-medium">{selectedEmp.vacation_days_balance} يوم</div>
              </div>
              <div>
                <span className="text-gray-600">حالة التوظيف:</span>
                <div className="font-medium">
                  {selectedEmp.employment_status === 'active' ? 'نشط' : 
                   selectedEmp.employment_status === 'suspended' ? 'موقوف' : 'منتهي'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={handleCalculate} disabled={isLoading || !formData.employee_id}>
            {getIcon("calculator")} حساب مكافأة نهاية الخدمة
          </Button>
        </div>
      </div>

      <Dialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title="نتيجة حساب مكافأة نهاية الخدمة"
        maxWidth="600px"
      >
        {calculation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">سنوات الخدمة</div>
                <div className="text-xl font-bold">{calculation.years_of_service} سنة</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">أشهر الخدمة</div>
                <div className="text-xl font-bold">{calculation.months_of_service} شهر</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">أيام الخدمة</div>
                <div className="text-xl font-bold">{calculation.days_of_service} يوم</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">آخر راتب إجمالي</div>
                <div className="text-xl font-bold">{formatCurrency(calculation.last_gross_salary)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">تفاصيل الحساب:</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>مكافأة نهاية الخدمة:</span>
                  <span className="font-medium">{formatCurrency(calculation.eosb_amount)}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>رصيد الإجازات غير المستخدم:</span>
                  <span className="font-medium">{formatCurrency(calculation.unused_vacation_amount)}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>مبلغ فترة الإشعار:</span>
                  <span className="font-medium">{formatCurrency(calculation.notice_period_amount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">إجمالي التسوية:</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(calculation.total_settlement)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={() => {
                // TODO: Implement save/export functionality
                showToast("تم حفظ الحساب", "success");
              }}>
                {getIcon("save")} حفظ
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

