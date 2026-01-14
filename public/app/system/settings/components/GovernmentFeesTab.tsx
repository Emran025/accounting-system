"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { showToast, Dialog, ConfirmDialog } from "@/components/ui";
import { getIcon } from "@/lib/icons";

interface GovernmentFee {
  id: number;
  name: string;
  code?: string;
  percentage: number;
  fixed_amount?: number;
  account_id?: number | null;
  account?: {
      id: number;
      account_name: string;
      account_code: string;
  };
  is_active: boolean;
}

interface Account {
    id: number;
    account_name: string;
    account_code: string;
    account_type: string;
}

export function GovernmentFeesTab() {
  const [fees, setFees] = useState<GovernmentFee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<GovernmentFee | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<GovernmentFee>>({
      name: "",
      percentage: 0,
      fixed_amount: 0,
      account_id: null,
      is_active: true
  });

  const loadFees = useCallback(async () => {
    try {
      const response: any = await fetchAPI("/api/government_fees");
      if (response.data && response.data.fees) {
        setFees(response.data.fees);
      }
    } catch (e) {
      console.error(e);
      showToast("خطأ في تحميل البيانات", "error");
    }
  }, []);

  const loadAccounts = useCallback(async () => {
      try {
          const response: any = await fetchAPI("/api/accounts");
          if (response.data) {
              // Handle both direct array and wrapped object
              const list = Array.isArray(response.data) ? response.data : (response.data.accounts || []);
              if (Array.isArray(list)) {
                setAccounts(list.filter((a: any) => a.account_type === 'Liability'));
              }
          }
      } catch (e) {
          console.error("Error loading accounts", e);
      }
  }, []);

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        await Promise.all([loadFees(), loadAccounts()]);
        setIsLoading(false);
    };
    init();
  }, [loadFees, loadAccounts]);

  const handleOpenDialog = (fee?: GovernmentFee) => {
      if (fee) {
          setEditingFee(fee);
          setFormData({ ...fee });
      } else {
          setEditingFee(null);
          setFormData({
              name: "",
              percentage: 0,
              fixed_amount: 0,
              account_id: accounts.find(a => a.account_code === '2310')?.id || null, // Default to General Fees if found
              is_active: true
          });
      }
      setDialogOpen(true);
  };

  const calculateSample = () => {
      const base = 1000;
      const pct = Number(formData.percentage) || 0;
      const fixed = Number(formData.fixed_amount) || 0;
      return (base * (pct / 100)) + fixed;
  };

  const handleSave = async () => {
      if (!formData.name) {
          showToast("يرجى إدخال الاسم", "error");
          return;
      }

      try {
          const payload = {
              ...formData,
              percentage: Number(formData.percentage),
              fixed_amount: Number(formData.fixed_amount),
          };

          if (editingFee) {
              await fetchAPI(`/api/government_fees/${editingFee.id}`, {
                  method: "PUT",
                  body: JSON.stringify(payload)
              });
              showToast("تم التحديث بنجاح", "success");
          } else {
              await fetchAPI("/api/government_fees", {
                  method: "POST",
                  body: JSON.stringify(payload)
              });
              showToast("تمت الإضافة بنجاح", "success");
          }
          setDialogOpen(false);
          loadFees();
      } catch (e) {
          showToast("حدث خطأ أثناء الحفظ", "error");
      }
  };

  const handleDeleteClick = (id: number) => {
      setDeleteId(id);
      setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (!deleteId) return;
      try {
          await fetchAPI(`/api/government_fees/${deleteId}`, { method: "DELETE" });
          showToast("تم الحذف بنجاح", "success");
          loadFees();
      } catch (e) {
          showToast("حدث خطأ أثناء الحذف", "error");
      }
  };

  return (
    <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>الالتزامات الحكومية (الخراج)</h3>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenDialog()}>
                {getIcon("plus")} إضافة التزام جديد
            </button>
        </div>
        <div className="card-body">
            {isLoading ? (
                <div className="text-center p-4"><i className="fas fa-spinner fa-spin"></i> جاري التحميل...</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>النسبة المئوية</th>
                                <th>مبلغ ثابت</th>
                                <th>حساب الالتزام (GL)</th>
                                <th>الحالة</th>
                                <th style={{ width: "120px" }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center">لا توجد سجلات</td>
                                </tr>
                            ) : fees.map(fee => (
                                <tr key={fee.id}>
                                    <td>{fee.name}</td>
                                    <td>{fee.percentage}%</td>
                                    <td>{fee.fixed_amount ? fee.fixed_amount.toFixed(2) : '-'}</td>
                                    <td>
                                        {fee.account ? (
                                            <span className="badge badge-secondary">
                                                {fee.account.account_code} - {fee.account.account_name}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span className={`badge ${fee.is_active ? 'badge-success' : 'badge-danger'}`}>
                                            {fee.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="btn-group">
                                            <button className="btn btn-sm btn-icon" onClick={() => handleOpenDialog(fee)} title="تعديل">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button className="btn btn-sm btn-icon text-danger" onClick={() => handleDeleteClick(fee.id)} title="حذف">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        <Dialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title={editingFee ? "تعديل التزام" : "إضافة التزام جديد"}
            footer={
                <>
                    <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
                </>
            }
        >
            <div className="form-group">
                <label>الاسم *</label>
                <input 
                    type="text" 
                    className="form-control"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            
            <div className="row">
                <div className="col-md-6 form-group">
                    <label>النسبة المئوية (%)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        className="form-control"
                        value={formData.percentage}
                        onChange={e => setFormData({...formData, percentage: parseFloat(e.target.value)})}
                    />
                    <small className="text-muted">نسبة من السعر الخاضع للرسوم (السعر الأساسي)</small>
                </div>
                <div className="col-md-6 form-group">
                    <label>مبلغ ثابت (إضافي)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        className="form-control"
                        value={formData.fixed_amount}
                        onChange={e => setFormData({...formData, fixed_amount: parseFloat(e.target.value)})}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>ربط بحساب محاسبي (GL) *</label>
                <select 
                    className="form-control"
                    value={formData.account_id || ""}
                    onChange={e => setFormData({...formData, account_id: Number(e.target.value)})}
                >
                    <option value="">اختر الحساب...</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                        </option>
                    ))}
                </select>
                <small className="text-muted">سيتم تسجيل الالتزام في هذا الحساب عند البيع</small>
            </div>

            <div className="form-group checkbox-group">
                <label>
                    <input 
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    />
                    &nbsp; تفعيل هذا الرسوم
                </label>
            </div>

            <div className="alert alert-info mt-3">
                <strong>مثال:</strong> عند بيع منتج بقيمة 1000 ريال:
                <br/>
                قيمة الخراج = {calculateSample().toFixed(2)} ريال
            </div>
        </Dialog>

        <ConfirmDialog
            isOpen={confirmDialogOpen}
            onClose={() => setConfirmDialogOpen(false)}
            onConfirm={handleConfirmDelete}
            title="تأكيد الحذف"
            message="هل أنت متأكد من حذف هذا السجل؟ لن يؤثر الحذف على الفواتير القديمة المحفوظة."
            confirmText="حذف"
            confirmVariant="danger"
        />
    </div>
  );
}
