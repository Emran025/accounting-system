import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { showToast, Dialog, Table, Column } from "@/components/ui";
import { Currency, CurrencyDenomination } from "../types";
import { getIcon } from "@/lib/icons";
import { Switch } from "@/components/ui/switch";
import { TextInput } from "@/components/ui/TextInput";
import { Input } from "@/components/ui/Input";

export function CurrencySettingsTab() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Currency>>({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: 1,
    is_active: true,
    denominations: []
  });

  const loadCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAPI("/api/currencies");
      if (res.success) {
        setCurrencies(res.data as Currency[]);
      }
    } catch (e) {
      console.error(e);
      showToast("خطأ في تحميل العملات", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  const handleSave = async () => {
    try {
      const url = editingCurrency 
        ? `/api/currencies/${editingCurrency.id}`
        : "/api/currencies";
      
      const method = editingCurrency ? "PUT" : "POST";
      
      const res = await fetchAPI(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.success) {
        showToast(editingCurrency ? "تم تحديث العملة" : "تم إضافة العملة", "success");
        setIsModalOpen(false);
        loadCurrencies();
      } else {
        showToast(res.message || "حدث خطأ", "error");
      }
    } catch (e) {
        showToast("خطأ في الحفظ", "error");
    }
  };

  const handleEdit = (curr: Currency) => {
    setEditingCurrency(curr);
    setFormData({
        code: curr.code,
        name: curr.name,
        symbol: curr.symbol,
        exchange_rate: curr.exchange_rate,
        is_active: curr.is_active,
        denominations: curr.denominations || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه العملة؟")) return;
    try {
        const res = await fetchAPI(`/api/currencies/${id}`, { method: "DELETE" });
        if (res.success) {
            showToast("تم الحذف بنجاح", "success");
            loadCurrencies();
        } else {
            showToast(res.message || "فشل الحذف", "error");
        }
    } catch {
        showToast("خطأ في الحذف", "error");
    }
  };

  const handleToggleActive = async (curr: Currency) => {
      try {
          const res = await fetchAPI(`/api/currencies/${curr.id}/toggle`, { method: "POST" });
          if (res.success) {
              loadCurrencies();
              showToast("تم تحديث الحالة", "success");
          } else {
               showToast(res.message || "فشل التحديث", "error");
          }
      } catch {
          showToast("خطأ في التحديث", "error");
      }
  }
    
  // Banknotes helper in form
  const addDenomination = () => {
      const currentDenoms = formData.denominations || [];
      setFormData({...formData, denominations: [...currentDenoms, { value: 0, label: "" }]});
  };

  const removeDenomination = (index: number) => {
      const currentDenoms = [...(formData.denominations || [])];
      currentDenoms.splice(index, 1);
      setFormData({...formData, denominations: currentDenoms});
  };

  const updateDenomination = (index: number, field: keyof CurrencyDenomination, value: any) => {
      const currentDenoms = [...(formData.denominations || [])];
      currentDenoms[index] = { ...currentDenoms[index], [field]: value };
      setFormData({...formData, denominations: currentDenoms});
  };

  const columns: Column<Currency>[] = [
    {
      key: "name",
      header: "العملة",
      render: (curr) => (
        <>
            {curr.name} <span className="text-muted">({curr.code})</span>
            {curr.is_primary && <span className="badge badge-success-light mr-2">الرئيسية</span>}
        </>
      )
    },
    { key: "symbol", header: "الرمز" },
    { 
        key: "exchange_rate", 
        header: "سعر الصرف",
        render: (curr) => Number(curr.exchange_rate).toFixed(4)
    },
    {
        key: "is_active",
        header: "الحالة",
        render: (curr) => (
             <Switch
                  checked={curr.is_active}
                  onChange={() => handleToggleActive(curr)}
                  disabled={curr.is_primary}
              />
        )
    },
    {
        key: "actions",
        header: "إجراءات",
        render: (curr) => (
             <div className="action-buttons">
                <button className="icon-btn edit" onClick={() => handleEdit(curr)} title="تعديل">
                  {getIcon("edit")}
                </button>
                {!curr.is_primary && (
                  <button className="icon-btn delete" onClick={() => handleDelete(curr.id)} title="حذف">
                    {getIcon("trash")}
                  </button>
                )}
            </div>
        )
    }
  ];

  return (
    <div className="sales-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3>إعدادات العملات</h3>
        <button className="btn btn-primary" onClick={() => {
            setEditingCurrency(null);
            setFormData({ code: "", name: "", symbol: "", exchange_rate: 1, is_active: true, denominations: [] });
            setIsModalOpen(true);
        }}>
            <i className="fas fa-plus"></i> إضافة عملة
        </button>
      </div>

      <Table
        data={currencies}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
      />

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCurrency ? "تعديل العملة" : "إضافة عملة جديدة"}
        maxWidth="800px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleSave}>حفظ</button>
          </>
        }
      >
        <div className="settings-form-grid">
             <div className="form-group">
                <TextInput
                    label="اسم العملة"
                    value={formData.name || ""} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            <div className="form-group">
                <TextInput
                    label="الكود (ISO)"
                    value={formData.code || ""} 
                    maxLength={3}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                />
            </div>
            <div className="form-group">
                <TextInput
                    label="الرمز"
                    value={formData.symbol || ""} 
                    onChange={e => setFormData({...formData, symbol: e.target.value})}
                />
            </div>
            <div className="form-group">
                <TextInput
                    label="سعر الصرف (مقابل العملة الرئيسية)"
                    type="number" 
                    step="0.0001"
                    value={formData.exchange_rate} 
                    onChange={e => setFormData({...formData, exchange_rate: parseFloat(e.target.value)})}
                    disabled={editingCurrency?.is_primary} 
                />
            </div>
        </div>

        <hr />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4>الفئات النقدية (Banknotes)</h4>
            <button className="btn btn-sm btn-secondary" onClick={addDenomination}>
                <i className="fas fa-plus"></i> إضافة فئة
            </button>
        </div>

        <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>القيمة</th>
                        <th>المسمى (اختياري)</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {formData.denominations?.map((denom, idx) => (
                        <tr key={idx}>
                            <td>
                                <Input 
                                    type="number" 
                                    className="form-control form-control-sm"
                                    value={denom.value}
                                    onChange={e => updateDenomination(idx, 'value', parseFloat(e.target.value))}
                                />
                            </td>
                            <td>
                                <Input 
                                    type="text" 
                                    className="form-control form-control-sm"
                                    value={denom.label}
                                    onChange={e => updateDenomination(idx, 'label', e.target.value)}
                                    placeholder={`${denom.value} ${formData.name || ''}`}
                                />
                            </td>
                            <td>
                                <button className="btn-icon text-danger" onClick={() => removeDenomination(idx)}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Dialog>
    </div>
  );
}
