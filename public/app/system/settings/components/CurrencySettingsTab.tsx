"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Dialog, Table, Column } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { Currency, CurrencyDenomination, CurrencyPolicy, PolicyStatus } from "../types";
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
      const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE);
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
        ? API_ENDPOINTS.FINANCE.CURRENCIES.withId(editingCurrency.id)
        : API_ENDPOINTS.FINANCE.CURRENCIES.BASE;

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

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد الحذف",
      message: "هل أنت متأكد من حذف هذه العملة؟",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.withId(id), { method: "DELETE" });
          if (res.success) {
            showToast("تم الحذف بنجاح", "success");
            loadCurrencies();
          } else {
            showToast(res.message || "فشل الحذف", "error");
          }
        } catch {
          showToast("خطأ في الحذف", "error");
        }
      }
    });
  };

  const handleToggleActive = async (curr: Currency) => {
    try {
      const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.TOGGLE(curr.id), { method: "POST" });
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
    setFormData({ ...formData, denominations: [...currentDenoms, { value: 0, label: "" }] });
  };

  const removeDenomination = (index: number) => {
    const currentDenoms = [...(formData.denominations || [])];
    currentDenoms.splice(index, 1);
    setFormData({ ...formData, denominations: currentDenoms });
  };

  const updateDenomination = (index: number, field: keyof CurrencyDenomination, value: any) => {
    const currentDenoms = [...(formData.denominations || [])];
    currentDenoms[index] = { ...currentDenoms[index], [field]: value };
    setFormData({ ...formData, denominations: currentDenoms });
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

  const denominationColumns: Column<CurrencyDenomination>[] = [
    {
      key: "value",
      header: "القيمة",
      render: (denom, idx) => (
        <Input
          type="number"
          className="form-control form-control-sm"
          value={denom.value}
          onChange={e => updateDenomination(idx, 'value', parseFloat(e.target.value))}
        />
      )
    },
    {
      key: "label",
      header: "المسمى (اختياري)",
      render: (denom, idx) => (
        <Input
          type="text"
          className="form-control form-control-sm"
          value={denom.label}
          onChange={e => updateDenomination(idx, 'label', e.target.value)}
          placeholder={`${denom.value} ${formData.name || ''}`}
        />
      )
    },
    {
      key: "actions",
      header: "",
      render: (_, idx) => (
        <button className="btn-icon text-danger" onClick={() => removeDenomination(idx)}>
          {getIcon("trash")}
        </button>
      )
    }
  ];

  const [activeSubTab, setActiveSubTab] = useState("list");

  // --- Currency List State ---
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [currencyForm, setCurrencyForm] = useState<Partial<Currency>>({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: 1,
    is_active: true,
    denominations: []
  });

  // --- Policy State ---
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [policies, setPolicies] = useState<CurrencyPolicy[]>([]);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);

  // --- Confirmation Dialog State ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "primary" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    variant: "primary"
  });

  // --- Initial Load ---
  const loadData = useCallback(async () => {
    setLoadingCurrencies(true);
    setLoadingPolicy(true);
    try {
      const [currRes, statusRes, policiesRes] = await Promise.all([
        fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE),
        fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.ACTIVE),
        fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.BASE)
      ]);

      if (currRes.success) setCurrencies(currRes.data as Currency[]);
      if (statusRes.success) setPolicyStatus(statusRes.data as PolicyStatus);
      if (policiesRes.success) {
        const pols = policiesRes.data as CurrencyPolicy[];
        setPolicies(pols);
        const active = pols.find(p => p.is_active);
        if (active) setSelectedPolicyId(active.id);
      }

    } catch (e) {
      console.error(e);
      showToast("خطأ في تحميل البيانات", "error");
    } finally {
      setLoadingCurrencies(false);
      setLoadingPolicy(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // --- Currency CRUD Handlers ---

  const handleSaveCurrency = async () => {
    try {
      const url = editingCurrency
        ? API_ENDPOINTS.FINANCE.CURRENCIES.withId(editingCurrency.id)
        : API_ENDPOINTS.FINANCE.CURRENCIES.BASE;

      const method = editingCurrency ? "PUT" : "POST";

      const res = await fetchAPI(url, {
        method,
        body: JSON.stringify(currencyForm),
      });

      if (res.success) {
        showToast(editingCurrency ? "تم تحديث العملة" : "تم إضافة العملة", "success");
        setIsCurrencyModalOpen(false);
        // Reload specific part
        const currRes = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE);
        if (currRes.success) setCurrencies(currRes.data as Currency[]);
      } else {
        showToast(res.message || "حدث خطأ", "error");
      }
    } catch (e) {
      showToast("خطأ في الحفظ", "error");
    }
  };

  const handleEditCurrency = (curr: Currency) => {
    setEditingCurrency(curr);
    setCurrencyForm({
      code: curr.code,
      name: curr.name,
      symbol: curr.symbol,
      exchange_rate: curr.exchange_rate,
      is_active: curr.is_active,
      denominations: curr.denominations || []
    });
    setIsCurrencyModalOpen(true);
  };

  const handleDeleteCurrency = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد الحذف",
      message: "هل أنت متأكد من حذف هذه العملة؟",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.withId(id), { method: "DELETE" });
          if (res.success) {
            showToast("تم الحذف بنجاح", "success");
            const currRes = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE);
            if (currRes.success) setCurrencies(currRes.data as Currency[]);
          } else {
            showToast(res.message || "فشل الحذف", "error");
          }
        } catch {
          showToast("خطأ في الحذف", "error");
        }
      }
    });
  };

  const handleToggleActiveCurrency = async (curr: Currency) => {
    try {
      const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.TOGGLE(curr.id), { method: "POST" });
      if (res.success) {
        const currRes = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE);
        if (currRes.success) setCurrencies(currRes.data as Currency[]);
        showToast("تم تحديث الحالة", "success");
      } else {
        showToast(res.message || "فشل التحديث", "error");
      }
    } catch {
      showToast("خطأ في التحديث", "error");
    }
  }

  // --- Policy Handlers ---

  const handleActivatePolicy = async () => {
    if (!selectedPolicyId) return;

    setConfirmDialog({
      isOpen: true,
      title: "تأكيد تغيير السياسة",
      message: "هل أنت متأكد من تغيير سياسة العملات؟ قد يؤثر هذا على كيفية معالجة المعاملات الجديدة.",
      variant: "primary",
      onConfirm: async () => {
        try {
          const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCY_POLICIES.ACTIVATE(selectedPolicyId), { method: "POST" });
          if (res.success) {
            showToast("تم تفعيل السياسة بنجاح", "success");
            loadData(); // Reload all to refresh status
          } else {
            showToast(res.message || "فشل تفعيل السياسة", "error");
          }
        } catch (e) {
          showToast("خطأ في الاتصال", "error");
        }
      }
    });
  };


  // --- Columns Definitions ---


  // --- Render ---

  return (
    <div className="settings-wrapper">
      {/* Inner Tab Navigation */}
      <div className="settings-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="fas fa-coins" style={{ color: 'var(--primary-color)', fontSize: '1.25rem' }}></i>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>إدارة العملات والسياسات المالية</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveSubTab("list")}
            className={`tab-btn ${activeSubTab === "list" ? "active" : ""}`}
          >
            <i className="fas fa-list"></i>
            قائمة العملات
          </button>
          <button
            onClick={() => setActiveSubTab("policy")}
            className={`tab-btn ${activeSubTab === "policy" ? "active" : ""}`}
          >
            <i className="fas fa-shield-alt"></i>
            سياسة الحوكمة
          </button>
        </div>
      </div>

      {activeSubTab === "list" && (
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <TextInput
                  label="الكود (ISO)"
                  value={formData.code || ""}
                  maxLength={3}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <TextInput
                  label="الرمز"
                  value={formData.symbol || ""}
                  onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                />
              </div>
              <div className="form-group">
                <TextInput
                  label="سعر الصرف (مقابل العملة الرئيسية)"
                  type="number"
                  step="0.0001"
                  value={formData.exchange_rate}
                  onChange={e => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) })}
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

            <div className="denominations-table">
              <Table
                columns={denominationColumns}
                data={formData.denominations || []}
                keyExtractor={(_, idx) => idx}
                emptyMessage="لا توجد فئات نقدية مضافة"
              />
            </div>
          </Dialog>
        </div>
      )}

      {activeSubTab === "policy" && (
        <div className="sales-card animate-fade">
          {/* Header Section */}
          <div className="card-header-flex">
            <div className="title-with-icon">
              <h3 style={{ margin: 0 }}>سياسة الحوكمة المالية</h3>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleActivatePolicy}
              disabled={!selectedPolicyId || policies.find(p => p.id === selectedPolicyId)?.is_active}
            >
              <i className="fas fa-save"></i>
              حفظ واعتماد السياسة
            </button>
          </div>

          <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            حدد السياسة التي يتبعها النظام في معالجة العملات الأجنبية وقيود اليومية.
          </p>

          {/* Loading State */}
          {loadingPolicy ? (
            <div className="empty-state" style={{ minHeight: '200px' }}>
              <div className="btn-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderColor: 'var(--border-color)', borderTopColor: 'var(--primary-color)' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل السياسات المالية...</p>
            </div>
          ) : policies.length === 0 ? (
            /* Empty State */
            <div className="empty-state" style={{ minHeight: '250px', background: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)' }}>
              <i className="fas fa-folder-open" style={{ fontSize: '2.5rem' }}></i>
              <h3>لا توجد سياسات متاحة</h3>
              <p>لم يتم العثور على أي سياسات مالية معرفة في النظام. يرجى التأكد من تشغيل البيانات الأولية (Seeders).</p>
            </div>
          ) : (
            /* Policies List */
            <div className="roles-list" style={{ padding: 0, maxHeight: 'none', overflow: 'visible' }}>
              {policies.map(policy => {
                const isSelected = selectedPolicyId === policy.id;
                const isActive = policy.is_active;

                return (
                  <div
                    key={policy.id}
                    onClick={() => setSelectedPolicyId(policy.id)}
                    className={`role-item ${isSelected ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.25rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    {/* Selection Indicator */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'white' : 'var(--border-color)'}`,
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.2s ease'
                    }}>
                      {isSelected && <i className="fas fa-check" style={{ fontSize: '0.65rem' }}></i>}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="role-info" style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.05rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {policy.name}
                          <span className={isSelected ? '' : 'badge-system'} style={{
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: isSelected ? 'rgba(255,255,255,0.2)' : undefined
                          }}>
                            {policy.policy_type}
                          </span>
                          {isActive && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fas fa-check-circle"></i> السياسة المطبقة
                            </span>
                          )}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          opacity: isSelected ? 0.9 : 0.75,
                          lineHeight: 1.6
                        }}>
                          {policy.description}
                        </p>
                      </div>

                      {/* Feature Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span className={`action-checkbox ${policy.allow_multi_currency_balances ? '' : 'disabled'}`} style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          background: isSelected
                            ? (policy.allow_multi_currency_balances ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')
                            : (policy.allow_multi_currency_balances ? 'var(--primary-subtle)' : 'var(--bg-color)'),
                          borderColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                          color: isSelected ? 'white' : undefined
                        }}>
                          <i className={`fas ${policy.allow_multi_currency_balances ? 'fa-check' : 'fa-times'}`} style={{ fontSize: '0.7rem' }}></i>
                          أرصدة متعددة العملات
                        </span>

                        <span className={`action-checkbox ${policy.revaluation_enabled ? '' : 'disabled'}`} style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          background: isSelected
                            ? (policy.revaluation_enabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')
                            : (policy.revaluation_enabled ? 'var(--primary-subtle)' : 'var(--bg-color)'),
                          borderColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                          color: isSelected ? 'white' : undefined
                        }}>
                          <i className={`fas ${policy.revaluation_enabled ? 'fa-check' : 'fa-times'}`} style={{ fontSize: '0.7rem' }}></i>
                          إعادة تقييم فروقات العملة
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Alert */}
          <div style={{ marginTop: '1.5rem' }}>
            <Alert
              type="warning"
              message="ملاحظة هامة: تغيير السياسة المالية لا يؤثر على القيود السابقة (تُحفظ بنفس السياسة التي أنشئت بها). السياسة الجديدة ستطبق فقط على العمليات التي تتم بعد لحظة التفعيل."
            />
          </div>
        </div>
      )}

      {/* --- Modals --- */}

      {/* Currency Modal */}
      <Dialog
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        title={editingCurrency ? "تعديل العملة" : "إضافة عملة جديدة"}
        maxWidth="700px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsCurrencyModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleSaveCurrency}>حفظ</button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 p-1">
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="اسم العملة"
              value={currencyForm.name || ""}
              onChange={e => setCurrencyForm({ ...currencyForm, name: e.target.value })}
              placeholder="مثال: دولار أمريكي"
            />
            <TextInput
              label="كود العملة (ISO)"
              value={currencyForm.code || ""}
              maxLength={3}
              onChange={e => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
              placeholder="USD"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="الرمز"
              value={currencyForm.symbol || ""}
              onChange={e => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
              placeholder="$"
            />
            <div>
              <TextInput
                label="سعر الصرف"
                type="number"
                step="0.0001"
                value={currencyForm.exchange_rate}
                onChange={e => setCurrencyForm({ ...currencyForm, exchange_rate: parseFloat(e.target.value) })}
                disabled={editingCurrency?.is_primary}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editingCurrency?.is_primary
                  ? "لا يمكن تغيير سعر صرف العملة الرئيسية"
                  : `1 ${currencyForm.code || 'وحدة'} = ${currencyForm.exchange_rate} ${policyStatus?.reference_currency?.code || 'عملة رئيسية'}`
                }
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 my-2 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-gray-800">الفئات النقدية (Banknotes)</h4>
              <button className="text-blue-600 text-sm hover:underline flex items-center gap-1" onClick={addDenomination}>
                <i className="fas fa-plus-circle"></i> إضافة فئة
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <Table
                columns={denominationColumns}
                data={currencyForm.denominations || []}
                keyExtractor={(_, idx) => idx}
                emptyMessage="لا يوجد فئات نقدية مضافة"
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmVariant={confirmDialog.variant}
        confirmText="تأكيد"
        cancelText="إلغاء"
      />

    </div>
  );
}
