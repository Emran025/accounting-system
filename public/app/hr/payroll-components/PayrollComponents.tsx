"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { PayrollComponent } from "../types";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function PayrollComponents() {
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState<PayrollComponent | null>(null);

  const [formData, setFormData] = useState({
    component_code: "",
    component_name: "",
    component_type: "allowance" as PayrollComponent['component_type'],
    calculation_type: "fixed" as PayrollComponent['calculation_type'],
    base_amount: "",
    percentage: "",
    formula: "",
    is_taxable: true,
    is_active: true,
    display_order: 0,
    description: ""
  });

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI('/api/payroll-components');
      setComponents(res.data || res || []);
    } catch (e) {
      showToast("فشل تحميل مكونات الرواتب", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.component_code || !formData.component_name) {
      showToast("يرجى إدخال جميع الحقول المطلوبة", "error");
      return;
    }

    try {
      const payload = {
        ...formData,
        base_amount: formData.base_amount ? parseFloat(formData.base_amount) : null,
        percentage: formData.percentage ? parseFloat(formData.percentage) : null,
        display_order: parseInt(formData.display_order.toString()) || 0
      };

      if (editingComponent) {
        await fetchAPI(`/api/payroll-components/${editingComponent.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast("تم تحديث المكون بنجاح", "success");
      } else {
        await fetchAPI('/api/payroll-components', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast("تم إنشاء المكون بنجاح", "success");
      }

      setShowDialog(false);
      resetForm();
      loadComponents();
    } catch (e: any) {
      showToast(e.message || "فشل حفظ المكون", "error");
    }
  };

  const handleEdit = (component: PayrollComponent) => {
    setEditingComponent(component);
    setFormData({
      component_code: component.component_code,
      component_name: component.component_name,
      component_type: component.component_type,
      calculation_type: component.calculation_type,
      base_amount: component.base_amount?.toString() || "",
      percentage: component.percentage?.toString() || "",
      formula: component.formula || "",
      is_taxable: component.is_taxable,
      is_active: component.is_active,
      display_order: component.display_order,
      description: component.description || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المكون؟")) return;

    try {
      await fetchAPI(`/api/payroll-components/${id}`, {
        method: 'DELETE'
      });
      showToast("تم حذف المكون بنجاح", "success");
      loadComponents();
    } catch (e: any) {
      showToast(e.message || "فشل حذف المكون", "error");
    }
  };

  const resetForm = () => {
    setEditingComponent(null);
    setFormData({
      component_code: "",
      component_name: "",
      component_type: "allowance" as PayrollComponent['component_type'],
      calculation_type: "fixed" as PayrollComponent['calculation_type'],
      base_amount: "",
      percentage: "",
      formula: "",
      is_taxable: true,
      is_active: true,
      display_order: 0,
      description: ""
    });
  };

  const columns: Column<PayrollComponent>[] = [
    {
      key: "component_code",
      header: "كود المكون"
    },
    {
      key: "component_name",
      header: "اسم المكون"
    },
    {
      key: "component_type",
      header: "النوع",
      render: (comp) => {
        const types: Record<string, string> = {
          allowance: "بدل",
          deduction: "خصم",
          overtime: "ساعات إضافية",
          bonus: "مكافأة",
          other: "أخرى"
        };
        return types[comp.component_type] || comp.component_type;
      }
    },
    {
      key: "calculation_type",
      header: "نوع الحساب",
      render: (comp) => {
        const types: Record<string, string> = {
          fixed: "ثابت",
          percentage: "نسبة مئوية",
          formula: "صيغة",
          attendance_based: "بناءً على الحضور"
        };
        return types[comp.calculation_type] || comp.calculation_type;
      }
    },
    {
      key: "base_amount",
      header: "المبلغ الأساسي",
      render: (comp) => comp.base_amount ? comp.base_amount.toFixed(2) : "-"
    },
    {
      key: "is_active",
      header: "نشط",
      render: (comp) => (
        <span className={comp.is_active ? "badge badge-success" : "badge badge-secondary"}>
          {comp.is_active ? "نعم" : "لا"}
        </span>
      )
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (comp) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEdit(comp)}>
            {getIcon("edit")} تعديل
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(comp.id)}>
            {getIcon("trash")} حذف
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">مكونات الرواتب</h2>
        <Button onClick={() => {
          resetForm();
          setShowDialog(true);
        }}>
          {getIcon("plus")} إضافة مكون جديد
        </Button>
      </div>

      <Table
        data={components}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد مكونات رواتب"
        keyExtractor={(item) => item.id}
      />

      <Dialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          resetForm();
        }}
        title={editingComponent ? "تعديل مكون الراتب" : "إضافة مكون راتب جديد"}
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">كود المكون *</label>
              <TextInput
                value={formData.component_code}
                onChange={(e) => setFormData({ ...formData, component_code: e.target.value })}
                disabled={!!editingComponent}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اسم المكون *</label>
              <TextInput
                value={formData.component_name}
                onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نوع المكون *</label>
              <Select
                value={formData.component_type}
                onChange={(e) => setFormData({ ...formData, component_type: e.target.value as any })}
              >
                <option value="allowance">بدل</option>
                <option value="deduction">خصم</option>
                <option value="overtime">ساعات إضافية</option>
                <option value="bonus">مكافأة</option>
                <option value="other">أخرى</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع الحساب *</label>
              <Select
                value={formData.calculation_type}
                onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
              >
                <option value="fixed">ثابت</option>
                <option value="percentage">نسبة مئوية</option>
                <option value="formula">صيغة</option>
                <option value="attendance_based">بناءً على الحضور</option>
              </Select>
            </div>
          </div>

          {formData.calculation_type === 'fixed' && (
            <div>
              <label className="block text-sm font-medium mb-1">المبلغ الثابت *</label>
              <TextInput
                type="number"
                step="0.01"
                value={formData.base_amount}
                onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
              />
            </div>
          )}

          {formData.calculation_type === 'percentage' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">المبلغ الأساسي *</label>
                <TextInput
                  type="number"
                  step="0.01"
                  value={formData.base_amount}
                  onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">النسبة المئوية (%) *</label>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.calculation_type === 'formula' && (
            <div>
              <label className="block text-sm font-medium mb-1">الصيغة *</label>
              <TextInput
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="مثال: hours * rate * 1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                المتغيرات المتاحة: hours, rate, overtime_hours, base_salary
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ترتيب العرض</label>
              <TextInput
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_taxable}
                  onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                />
                <span>خاضع للضريبة</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>نشط</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

