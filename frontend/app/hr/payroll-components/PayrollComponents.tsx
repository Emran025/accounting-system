"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, showToast, Button, Label } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PayrollComponent } from "../types";
import { formatCurrency } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
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
      const res: any = await fetchAPI(API_ENDPOINTS.HR.COMPONENTS);
      const data = res.data || (Array.isArray(res) ? res : []);
      setComponents(data);
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
        await fetchAPI(`${API_ENDPOINTS.HR.COMPONENTS}/${editingComponent.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast("تم تحديث المكون بنجاح", "success");
      } else {
        await fetchAPI(API_ENDPOINTS.HR.COMPONENTS, {
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
      await fetchAPI(`${API_ENDPOINTS.HR.COMPONENTS}/${id}`, {
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
      header: "كود المكون",
      dataLabel: "كود المكون"
    },
    {
      key: "component_name",
      header: "اسم المكون",
      dataLabel: "اسم المكون"
    },
    {
      key: "component_type",
      header: "النوع",
      dataLabel: "النوع",
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
      dataLabel: "نوع الحساب",
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
      dataLabel: "المبلغ الأساسي",
      render: (comp) => comp.base_amount ? formatCurrency(comp.base_amount) : "-"
    },
    {
      key: "is_active",
      header: "نشط",
      dataLabel: "نشط",
      render: (comp) => (
        <span className={comp.is_active ? "badge badge-success" : "badge badge-secondary"}>
          {comp.is_active ? "نعم" : "لا"}
        </span>
      )
    },
    {
      key: "actions",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (comp) => (
        <ActionButtons
          actions={[
            {
              icon: "edit",
              title: "تعديل",
              variant: "edit",
              onClick: () => handleEdit(comp)
            },
            {
              icon: "trash",
              title: "حذف",
              variant: "delete",
              onClick: () => handleDelete(comp.id)
            }
          ]}
        />
      )
    }
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="مكونات الرواتب"
        titleIcon="settings"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            icon="plus">
            إضافة مكون جديد
          </Button>
        }
      />

      <div className="sales-card">
        <Table
          data={components}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد مكونات رواتب"
          keyExtractor={(item) => item.id.toString()}
        />
      </div>

      <Dialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          resetForm();
        }}
        title={editingComponent ? "تعديل مكون الراتب" : "إضافة مكون راتب جديد"}
        maxWidth="700px"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>كود المكون *</Label>
              <TextInput
                value={formData.component_code}
                onChange={(e) => setFormData({ ...formData, component_code: e.target.value })}
                disabled={!!editingComponent}
              />
            </div>
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>اسم المكون *</Label>
              <TextInput
                value={formData.component_name}
                onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>نوع المكون *</Label>
              <Select
                value={formData.component_type}
                onChange={(e) => setFormData({ ...formData, component_type: e.target.value as any })}
                options={[
                  { value: 'allowance', label: 'بدل' },
                  { value: 'deduction', label: 'خصم' },
                  { value: 'overtime', label: 'ساعات إضافية' },
                  { value: 'bonus', label: 'مكافأة' },
                  { value: 'other', label: 'أخرى' }
                ]}
              />
            </div>
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>نوع الحساب *</Label>
              <Select
                value={formData.calculation_type}
                onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                options={[
                  { value: 'fixed', label: 'ثابت' },
                  { value: 'percentage', label: 'نسبة مئوية' },
                  { value: 'formula', label: 'صيغة' },
                  { value: 'attendance_based', label: 'بناءً على الحضور' }
                ]}
              />
            </div>
          </div>

          {formData.calculation_type === 'fixed' && (
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>المبلغ الثابت *</Label>
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
                <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>المبلغ الأساسي *</Label>
                <TextInput
                  type="number"
                  step="0.01"
                  value={formData.base_amount}
                  onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                />
              </div>
              <div>
                <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>النسبة المئوية (%) *</Label>
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
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>الصيغة *</Label>
              <TextInput
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="مثال: hours * rate * 1.5"
              />
              <p className="text-xs" style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>
                المتغيرات المتاحة: hours, rate, overtime_hours, base_salary
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>ترتيب العرض</Label>
              <TextInput
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <Label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                <Checkbox
                  checked={formData.is_taxable}
                  onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                />
                <span style={{ color: 'var(--text-secondary)' }}>خاضع للضريبة</span>
              </Label>
              <Label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span style={{ color: 'var(--text-secondary)' }}>نشط</span>
              </Label>
            </div>
          </div>

          <div>
            <Label className="block mb-1" style={{ color: 'var(--text-secondary)' }}>الوصف</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSave} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
