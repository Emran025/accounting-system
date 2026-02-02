"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { showToast, Dialog, Table, Column } from "@/components/ui";
import { Currency, CurrencyDenomination, CurrencyPolicy, PolicyStatus } from "../types";
import { getIcon } from "@/lib/icons";
import { Switch } from "@/components/ui/switch";
import { TextInput } from "@/components/ui/TextInput";
import { Input } from "@/components/ui/Input";

export function CurrencySettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState("list");

  // --- Currency List State ---
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
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

  // --- Initial Load ---
  const loadData = useCallback(async () => {
    setLoadingCurrencies(true);
    setLoadingPolicy(true);
    try {
      const [currRes, statusRes, policiesRes] = await Promise.all([
        fetchAPI("/api/currencies"),
        fetchAPI("/api/currency-policies/active"),
        fetchAPI("/api/currency-policies")
      ]);

      if (currRes.success) setCurrencies(currRes.data as Currency[]);
      if (statusRes.success) setPolicyStatus(statusRes.data as PolicyStatus);
      if (policiesRes.success) setPolicies(policiesRes.data as CurrencyPolicy[]);

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
        ? `/api/currencies/${editingCurrency.id}`
        : "/api/currencies";

      const method = editingCurrency ? "PUT" : "POST";

      const res = await fetchAPI(url, {
        method,
        body: JSON.stringify(currencyForm),
      });

      if (res.success) {
        showToast(editingCurrency ? "تم تحديث العملة" : "تم إضافة العملة", "success");
        setIsCurrencyModalOpen(false);
        // Reload specific part
        const currRes = await fetchAPI("/api/currencies");
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

  const handleDeleteCurrency = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه العملة؟")) return;
    try {
      const res = await fetchAPI(`/api/currencies/${id}`, { method: "DELETE" });
      if (res.success) {
        showToast("تم الحذف بنجاح", "success");
        const currRes = await fetchAPI("/api/currencies");
        if (currRes.success) setCurrencies(currRes.data as Currency[]);
      } else {
        showToast(res.message || "فشل الحذف", "error");
      }
    } catch {
      showToast("خطأ في الحذف", "error");
    }
  };

  const handleToggleActiveCurrency = async (curr: Currency) => {
    try {
      const res = await fetchAPI(`/api/currencies/${curr.id}/toggle`, { method: "POST" });
      if (res.success) {
        const currRes = await fetchAPI("/api/currencies");
        if (currRes.success) setCurrencies(currRes.data as Currency[]);
        showToast("تم تحديث الحالة", "success");
      } else {
        showToast(res.message || "فشل التحديث", "error");
      }
    } catch {
      showToast("خطأ في التحديث", "error");
    }
  }

  // Denominations Helpers
  const addDenomination = () => {
    const currentDenoms = currencyForm.denominations || [];
    setCurrencyForm({ ...currencyForm, denominations: [...currentDenoms, { value: 0, label: "" }] });
  };

  const removeDenomination = (index: number) => {
    const currentDenoms = [...(currencyForm.denominations || [])];
    currentDenoms.splice(index, 1);
    setCurrencyForm({ ...currencyForm, denominations: currentDenoms });
  };

  const updateDenomination = (index: number, field: keyof CurrencyDenomination, value: any) => {
    const currentDenoms = [...(currencyForm.denominations || [])];
    currentDenoms[index] = { ...currentDenoms[index], [field]: value };
    setCurrencyForm({ ...currencyForm, denominations: currentDenoms });
  };


  // --- Policy Handlers ---

  const handleActivatePolicy = async () => {
    if (!selectedPolicyId) return;

    if (!confirm("هل أنت متأكد من تغيير سياسة العملات؟ قد يؤثر هذا على كيفية معالجة المعاملات الجديدة.")) return;

    try {
      const res = await fetchAPI(`/api/currency-policies/${selectedPolicyId}/activate`, { method: "POST" });
      if (res.success) {
        showToast("تم تفعيل السياسة بنجاح", "success");
        setIsPolicyModalOpen(false);
        loadData(); // Reload all to refresh status
      } else {
        showToast(res.message || "فشل تفعيل السياسة", "error");
      }
    } catch (e) {
      showToast("خطأ في الاتصال", "error");
    }
  };


  // --- Columns Definitions ---

  const currencyColumns: Column<Currency>[] = [
    {
      key: "name",
      header: "العملة",
      render: (curr) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{curr.name}</span>
          <span className="text-gray-500 text-sm">({curr.code})</span>
          {curr.is_primary && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">الرئيسية</span>}
        </div>
      )
    },
    { key: "symbol", header: "الرمز" },
    {
      key: "exchange_rate",
      header: "سعر الصرف",
      render: (curr) => (
        <div className="font-mono text-sm" dir="ltr">
          {Number(curr.exchange_rate).toFixed(4)}
        </div>
      )
    },
    {
      key: "is_active",
      header: "الحالة",
      render: (curr) => (
        <Switch
          checked={curr.is_active}
          onChange={() => handleToggleActiveCurrency(curr)}
          disabled={curr.is_primary}
        />
      )
    },
    {
      key: "actions",
      header: "",
      render: (curr) => (
        <div className="action-buttons justify-end">
          <button className="icon-btn edit" onClick={() => handleEditCurrency(curr)} title="تعديل">
            {getIcon("edit")}
          </button>
          {!curr.is_primary && (
            <button className="icon-btn delete text-red-500 hover:bg-red-50 hover:border-red-200" onClick={() => handleDeleteCurrency(curr.id)} title="حذف">
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
          placeholder={`${denom.value} ${currencyForm.name || ''}`}
        />
      )
    },
    {
      key: "actions",
      header: "",
      render: (_, idx) => (
        <button className="icon-btn text-red-500 hover:bg-red-50" onClick={() => removeDenomination(idx)}>
          {getIcon("trash")}
        </button>
      )
    }
  ];


  // --- Render ---

  return (
    <div className="flex flex-col gap-6">
      {/* Inner Tab Navigation */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-coins text-blue-500"></i>
          إدارة العملات والسياسات المالية
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === "list"
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            قائمة العملات
          </button>
          <button
            onClick={() => setActiveSubTab("policy")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === "policy"
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            سياسة الحوكمة
          </button>
        </div>
      </div>

      {activeSubTab === "list" && (
        <div className="sales-card animate-fade">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="mb-1">قائمة العملات المعرفة</h3>
              <p className="text-gray-500 text-sm">إدارة العملات الأجنبية المتاحة في النظام وأسعار الصرف.</p>
            </div>

            <button className="btn btn-primary" onClick={() => {
              setEditingCurrency(null);
              setCurrencyForm({ code: "", name: "", symbol: "", exchange_rate: 1, is_active: true, denominations: [] });
              setIsCurrencyModalOpen(true);
            }}>
              <i className="fas fa-plus ml-2"></i> إضافة عملة
            </button>
          </div>

          <Table
            data={currencies}
            columns={currencyColumns}
            keyExtractor={(item) => item.id}
            isLoading={loadingCurrencies}
          />
        </div>
      )}

      {activeSubTab === "policy" && (
        <div className="animate-fade flex flex-col gap-6">

          {/* Current Policy Status Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">السياسة الحالية: {policyStatus?.policy_name}</h3>
                <p className="text-gray-600 max-w-2xl leading-relaxed">
                  تحدد هذه السياسة كيفية معالجة النظام للمعاملات متعددة العملات، وقت التحويل، وكيفية التعامل مع فروقات أسعار الصرف.
                </p>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(true)}
                className="px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-cog"></i>
                تغيير السياسة
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500 font-medium">نوع السياسة</span>
                <span className="text-base font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg w-fit border border-gray-100">
                  {policyStatus?.policy_type_label}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500 font-medium">العملة المرجعية (الأساس)</span>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    {policyStatus?.reference_currency?.code}
                  </span>
                  <span className="font-bold text-gray-800">{policyStatus?.reference_currency?.name}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className={`p-4 rounded-lg flex items-start gap-3 border ${policyStatus?.requires_posting_conversion ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${policyStatus?.requires_posting_conversion ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  <i className={`fas ${policyStatus?.requires_posting_conversion ? 'fa-check' : 'fa-times'}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">التحويل الفوري (Normalization)</h4>
                  <p className="text-xs text-gray-600">يتم تحويل جميع المعاملات الأجنبية إلى العملة المحلية فور إنشائها.</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-start gap-3 border ${policyStatus?.allows_multi_currency_balances ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${policyStatus?.allows_multi_currency_balances ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  <i className={`fas ${policyStatus?.allows_multi_currency_balances ? 'fa-check' : 'fa-times'}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">أرصدة متعددة العملات (Multi-Currency Ledgers)</h4>
                  <p className="text-xs text-gray-600">يحتفظ النظام بأرصدة الحسابات بالعملات الأصلية بشكل مستقل.</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-start gap-3 border ${policyStatus?.revaluation_enabled ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${policyStatus?.revaluation_enabled ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  <i className={`fas ${policyStatus?.revaluation_enabled ? 'fa-check' : 'fa-times'}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">إعادة التقييم الدوري (Revaluation)</h4>
                  <p className="text-xs text-gray-600">يتم احتساب فروقات أسعار الصرف دورياً للأصول والالتزامات الأجنبية.</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-start gap-3 border bg-gray-50 border-gray-200`}>
                <div className="mt-1 w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs">
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">توقيت التحويل</h4>
                  <p className="text-xs text-gray-600">
                    يتم التحويل: <span className="font-bold text-gray-800">{policyStatus?.conversion_timing}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Policies List (Read Only View) */}
          <div className="sales-card">
            <h3 className="mb-4 text-lg font-bold">أنواع السياسات المتاحة في النظام</h3>
            <div className="grid grid-cols-1 gap-4">
              {policyStatus?.has_active_policy && policies.map(policy => (
                <div key={policy.id} className={`p-4 rounded-lg border ${policy.is_active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'} transition-all`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      {policy.name}
                      {policy.is_active && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">النشطة حالياً</span>}
                    </h4>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{policy.policy_type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><i className={`fas ${policy.allow_multi_currency_balances ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i> أرصدة متعددة</span>
                    <span className="flex items-center gap-1"><i className={`fas ${policy.revaluation_enabled ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i> إعادة تقييم</span>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Policy Selection Modal */}
      <Dialog
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title="تغيير سياسة حوكمة العملات"
        maxWidth="600px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsPolicyModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleActivatePolicy} disabled={!selectedPolicyId || policies.find(p => p.id === selectedPolicyId)?.is_active}>تفعيل السياسة المختارة</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            <div className="flex items-center gap-2 mb-1 font-bold">
              <i className="fas fa-exclamation-triangle"></i>
              <span>تنبيه هام</span>
            </div>
            <p className="text-sm">تغيير سياسة العملات يعتبر إجراءً جوهرياً. لن تتأثر المعاملات التاريخية (بسبب خاصية الارتباط الزمني للسياسات)، ولكن جميع المعاملات الجديدة ستخضع للقواعد الجديدة فوراً.</p>
          </div>

          <div className="space-y-3 mt-4">
            {policies.map(policy => (
              <div
                key={policy.id}
                onClick={() => setSelectedPolicyId(policy.id)}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${selectedPolicyId === policy.id
                  ? "border-blue-500 bg-blue-50"
                  : (policy.is_active ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300")
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">{policy.name}</span>
                  {policy.is_active && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded font-bold">الحالية</span>}
                  {selectedPolicyId === policy.id && !policy.is_active && <i className="fas fa-check-circle text-blue-500 text-xl"></i>}
                </div>
                <p className="text-sm text-gray-600 leading-snug">{policy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

    </div>
  );
}
