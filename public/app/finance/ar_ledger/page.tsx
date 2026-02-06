"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Dialog, ConfirmDialog, showToast, showAlert, Button, FilterSection, FilterGroup, DateRangePicker, FilterActions, SelectableInvoiceTable, SelectedItem, SalesReturnDialog, SelectableInvoice, SelectableInvoiceItem, ReturnData, InvoiceTableColumn } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDate, formatDateTime, parseNumber } from "@/lib/utils";
import { User, getStoredUser, checkAuth } from "@/lib/auth";
import { getIcon, Icon } from "@/lib/icons";
interface LedgerTransaction extends SelectableInvoice {
  transaction_date: string;
  type: "invoice" | "payment" | "return";
  description?: string;
  amount: number;
  created_by?: string;
  is_deleted: boolean;
  reference_type?: string;
  reference_id?: number;
}

interface Pagination {
  total_records: number;
  total_pages: number;
  current_page: number;
};
interface LedgerStats {
  total_debit: number;
  total_credit: number;
  balance: number;
  transaction_count: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  tax_number?: string;
}

// This interface is for the detailed view of an invoice
interface DetailedInvoice extends SelectableInvoice {
  voucher_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_tax?: string;
  amount_paid?: number;
  vat_rate?: number;
  items: Array<SelectableInvoiceItem & { product_name?: string }>;
}

function ARLedgerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer_id");

  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [stats, setStats] = useState<LedgerStats>({
    total_debit: 0,
    total_credit: 0,
    balance: 0,
    transaction_count: 0,
  });

  const [pagination, setPagination] = useState<Pagination>({
    total_records: 0,
    total_pages: 0,
    current_page: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    date_from: "",
    date_to: "",
  });

  // Dialogs
  const [filterDialog, setFilterDialog] = useState(false);
  const [transactionDialog, setTransactionDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [restoreTransactionId, setRestoreTransactionId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<DetailedInvoice | null>(null);

  // Returns state
  const [selectedReturnItems, setSelectedReturnItems] = useState<SelectedItem[]>([]);
  const [returnDialog, setReturnDialog] = useState(false);
  const [invoicesMap, setInvoicesMap] = useState<Record<number, SelectableInvoice>>({});
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Form
  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<"payment" | "invoice">("payment");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionDescription, setTransactionDescription] = useState("");

  const itemsPerPage = 20;

  useEffect(() => {
    if (!customerId) {
      router.push("/ar_customers");
      return;
    }
  }, [customerId, router]);

  const loadCustomerDetails = useCallback(async () => {
    if (!customerId) return;

    try {
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.CUSTOMERS}?id=${customerId}`);
      if (response.success && response.data) {
        const customerData = Array.isArray(response.data) ? response.data[0] : response.data;
        setCustomer(customerData as Customer);
      }
    } catch {
      showToast("خطأ في تحميل بيانات العميل", "error");
    }
  }, [customerId]);

  const loadLedger = useCallback(
    async (page: number = 1) => {
      if (!customerId) return;

      try {
        setIsLoading(true);
        const offset = (page - 1) * itemsPerPage;
        let params = `customer_id=${customerId}&limit=${itemsPerPage}&offset=${offset}&show_deleted=${showDeleted}`;
        if (filters.search) params += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.type) params += `&type=${filters.type}`;
        if (filters.date_from) params += `&date_from=${filters.date_from}`;
        if (filters.date_to) params += `&date_to=${filters.date_to}`;

        const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.LEDGER}?${params}`);
        if (response.success && response.data) {
          const rawTransactions = response.data as any[];
          const mappedTransactions: LedgerTransaction[] = rawTransactions.map((item) => ({
            ...item,
            invoice_number: item.reference_id ? `REF-${item.reference_id}` : `TRX-${item.id}`,
            total_amount: item.amount,
            subtotal: item.amount,
            vat_amount: 0,
            discount_amount: 0,
            payment_type: item.type === "invoice" ? "credit" : "cash",
            created_at: item.transaction_date,
          }));

          setTransactions(mappedTransactions);
          if (response.stats) {
            setStats(response.stats as LedgerStats);
          }

          if (response.pagination) {
            setPagination(response.pagination as Pagination);
          }
          const total = Number(pagination.total_records) || 0;
          setTotalPages(Math.ceil(total / itemsPerPage));
          setCurrentPage(page);
        } else {
          showAlert("alert-container", response.message || "فشل تحميل العمليات", "error");
        }
      } catch {
        showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [customerId, showDeleted, filters]
  );

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkAuth();
      if (!authenticated) return;

      const storedUser = getStoredUser();
      setUser(storedUser);
      await loadCustomerDetails();
      await loadLedger();
    };
    init();
  }, [loadCustomerDetails, loadLedger]);

  const openAddTransactionDialog = () => {
    setCurrentTransactionId(null);
    setTransactionType("payment");
    setTransactionAmount("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setTransactionDescription("");
    setTransactionDialog(true);
  };

  const openEditTransaction = (transaction: LedgerTransaction) => {
    setCurrentTransactionId(transaction.id);
    setTransactionType(transaction.type === "invoice" ? "invoice" : "payment");
    setTransactionAmount(String(transaction.amount));
    const d = new Date(transaction.transaction_date);
    setTransactionDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setTransactionDescription(transaction.description || "");
    setTransactionDialog(true);
  };

  const saveTransaction = async () => {
    if (!transactionAmount || parseNumber(transactionAmount) <= 0) {
      showToast("المبلغ مطلوب", "error");
      return;
    }

    try {
      const data: any = {
        customer_id: customerId,
        type: transactionType,
        amount: parseNumber(transactionAmount),
        date: transactionDate,
        description: transactionDescription,
      };
      if (currentTransactionId) data.id = currentTransactionId;

      const method = currentTransactionId ? "PUT" : "POST";
      const response = await fetchAPI(API_ENDPOINTS.FINANCE.AR.TRANSACTIONS, {
        method,
        body: JSON.stringify(data),
      });

      if (response.success) {
        showToast("تم الحفظ بنجاح", "success");
        setTransactionDialog(false);
        await loadLedger(currentPage);
        await loadCustomerDetails();
      } else {
        showToast(response.message || "خطأ", "error");
      }
    } catch {
      showToast("خطأ في الحفظ", "error");
    }
  };

  const viewInvoice = async (id: number) => {
    try {
      const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${id}`);
      if (response.success && response.data) {
        setSelectedInvoice(response.data as DetailedInvoice);
        setViewDialog(true);
      }
    } catch {
      showAlert("alert-container", "خطأ في جلب التفاصيل", "error");
    }
  };

  const getInvoiceItems = async (item: LedgerTransaction): Promise<SelectableInvoiceItem[]> => {
    if (!item.reference_id) return [];

    const endpoint = item.reference_type === "sales_returns"
      ? `${API_ENDPOINTS.SALES.RETURNS.SHOW}?id=${item.reference_id}`
      : `${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${item.reference_id}`;

    try {
      const response = await fetchAPI(endpoint);
      if (response.success && response.data) {
        const data = response.data as DetailedInvoice;
        return (data.items as SelectableInvoiceItem[]) || [];
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch items", error);
      return [];
    }
  };

  const handleReturnSelection = useCallback((items: SelectedItem[]) => {
    setSelectedReturnItems(items);
  }, []);

  const openReturnDialog = async () => {
    if (selectedReturnItems.length === 0) {
      showToast("يرجى تحديد عناصر للإرجاع أولاً", "warning");
      return;
    }

    // Fetch missing invoice details for calculation
    const uniqueInvoiceIds = Array.from(new Set(selectedReturnItems.map(i => i.invoiceId)));
    const missingIds = uniqueInvoiceIds.filter(id => !invoicesMap[id]);

    if (missingIds.length > 0) {
      setIsLoadingInvoices(true);
      try {
        const newMap = { ...invoicesMap };
        await Promise.all(missingIds.map(async (id) => {
          const res = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${id}`);
          if (res.success && res.data) {
            newMap[id] = res.data as SelectableInvoice;
          }
        }));
        setInvoicesMap(newMap);
      } catch (error) {
        console.error("Failed to load invoice details", error);
        showToast("فشل تحميل بيانات الفواتير", "error");
      } finally {
        setIsLoadingInvoices(false);
      }
    }

    setReturnDialog(true);
  };

  const handleConfirmReturn = async (data: ReturnData | ReturnData[]) => {
    const dataArray = Array.isArray(data) ? data : [data];

    try {
      for (const returnData of dataArray) {
        const response = await fetchAPI(API_ENDPOINTS.SALES.RETURNS.BASE, {
          method: "POST",
          body: JSON.stringify(returnData),
        });

        if (!response.success) {
          throw new Error(response.message || "فشل تسجيل المرتجع");
        }
      }

      showToast("تم تسجيل المرتجع بنجاح", "success");
      // Result will be handled by onSuccess in dialog
    } catch (error: any) {
      showToast(error.message || "خطأ في تسجيل المرتجع", "error");
      throw error; // Re-throw to keep dialog open if needed
    }
  };

  const confirmDeleteTransaction = (id: number) => {
    setDeleteTransactionId(id);
    setConfirmDialog(true);
  };

  const deleteTransaction = async () => {
    if (!deleteTransactionId) return;

    try {
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.TRANSACTIONS}?id=${deleteTransactionId}`, {
        method: "DELETE",
      });
      if (response.success) {
        showToast("تم الحذف بنجاح", "success");
        setConfirmDialog(false);
        setDeleteTransactionId(null);
        await loadLedger(currentPage);
      } else {
        showToast(response.message || "خطأ", "error");
      }
    } catch {
      showToast("خطأ في الحذف", "error");
    }
  };

  const confirmRestoreTransaction = (id: number) => {
    setRestoreTransactionId(id);
    setConfirmDialog(true);
  };

  const restoreTransaction = async () => {
    if (!restoreTransactionId) return;

    try {
      const response = await fetchAPI(API_ENDPOINTS.FINANCE.AR.TRANSACTIONS, {
        method: "POST",
        body: JSON.stringify({ id: restoreTransactionId }),
      });
      if (response.success) {
        showToast("تم الاستعادة بنجاح", "success");
        setConfirmDialog(false);
        setRestoreTransactionId(null);
        await loadLedger(currentPage);
      } else {
        showToast(response.message || "خطأ", "error");
      }
    } catch {
      showToast("خطأ في الاستعادة", "error");
    }
  };

  const applyFilters = () => {
    setFilterDialog(false);
    loadLedger(1);
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      invoice: "فاتورة مبيعات",
      payment: "سند قبض",
      return: "مرتجع",
    };
    return types[type] || type;
  };

  const canEdit = (transaction: LedgerTransaction) => {
    if (transaction.is_deleted) return false;
    const transactionDate = new Date(transaction.transaction_date);
    const now = new Date();
    const diffMs = now.getTime() - transactionDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 48;
  };

  const columns: InvoiceTableColumn<LedgerTransaction>[] = [
    {
      key: "id",
      header: "#",
      dataLabel: "#",
      render: (item) => (
        <span
          className={item.reference_type === "invoices" ? "clickable-id" : ""}
          onClick={() => item.reference_type === "invoices" && viewInvoice(item.reference_id!)}
          style={{ cursor: item.reference_type === "invoices" ? "pointer" : "default", fontWeight: "bold", color: item.reference_type === "invoices" ? "var(--primary-color)" : "inherit" }}
        >
          {item.id}
        </span>
      ),
    },
    {
      key: "transaction_date",
      header: "التاريخ",
      dataLabel: "التاريخ",
      render: (item) => (
        <span style={{ fontSize: "0.9em" }}>
          {formatDateTime(item.transaction_date)}
        </span>
      ),
    },
    {
      key: "type",
      header: "نوع العملية",
      dataLabel: "نوع العملية",
      render: (item) => (
        <span
          className={`badge ${item.type === "invoice" ? "badge-primary" : "badge-success"
            }`}
        >
          {getTypeName(item.type)}
        </span>
      ),
    },
    {
      key: "description",
      header: "الوصف",
      dataLabel: "الوصف",
      render: (item) => (
        <div
          className={item.reference_type === "invoices" ? "clickable-desc" : ""}
          onClick={() => item.reference_type === "invoices" && viewInvoice(item.reference_id!)}
          style={{ cursor: item.reference_type === "invoices" ? "pointer" : "default" }}
        >
          {item.description || "-"} {item.is_deleted && "(محذوف)"}
        </div>
      ),
    },
    {
      key: "debit",
      header: "مدين (عليك)",
      dataLabel: "مدين (عليك)",
      render: (item) => (
        <span className="text-danger font-bold">
          {item.type === "invoice" ? formatCurrency(item.amount) : "-"}
        </span>
      ),
    },
    {
      key: "credit",
      header: "دائن (لك)",
      dataLabel: "دائن (لك)",
      render: (item) => (
        <span className="text-success font-bold">
          {item.type !== "invoice" ? formatCurrency(item.amount) : "-"}
        </span>
      ),
    },
    {
      key: "created_by",
      header: "المستخدم",
      dataLabel: "المستخدم",
      render: (item) => item.created_by || "-",
    },
    {
      key: "actions",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          {item.is_deleted ? (
            <button className="icon-btn edit" onClick={() => confirmRestoreTransaction(item.id)} title="استعادة">
              <Icon name="check" />
            </button>
          ) : (
            <>
              {canEdit(item) && (
                <button className="icon-btn edit" onClick={() => openEditTransaction(item)} title="تعديل">
                  <Icon name="edit" />
                </button>
              )}
              {/* Only allow delete for payment transactions, not invoices */}
              {item.type !== "invoice" && (
                <button className="icon-btn delete" onClick={() => confirmDeleteTransaction(item.id)} title="حذف">
                  <Icon name="trash" />
                </button>
              )}
              {item.reference_type === "invoices" && (
                <button className="icon-btn view" onClick={() => viewInvoice(item.reference_id!)} title="عرض الفاتورة">
                  <Icon name="eye" />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const handleConfirm = () => {
    if (deleteTransactionId) {
      deleteTransaction();
    } else if (restoreTransactionId) {
      restoreTransaction();
    }
  };

  if (!customerId) {
    return null;
  }

  return (
    <ModuleLayout groupKey="sales" requiredModule="ar_customers">
      <PageHeader
        title={`كشف حساب: ${customer?.name || ""}`}
        user={user}
        actions={
          <>
            <Button
              variant="secondary"
              icon="search"
              onClick={() => setFilterDialog(true)}
            >
              تصفية
            </Button>
            <Button
              variant="primary"
              icon="plus"
              onClick={openAddTransactionDialog}
            >
              عملية جديدة
            </Button>
          </>
        }
      />

      {customer && (
        <FilterSection className="animate-fade" style={{ marginBottom: "1.5rem" }}>
          <div className="title-with-icon">
            <div className="stat-icon products" style={{ width: "45px", height: "45px", fontSize: "1.2rem" }}>
              {getIcon("user")}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{customer.name}</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                {customer.phone || "بدون هاتف"} | {customer.tax_number || "بدون رقم ضريبي"}
              </p>
            </div>
          </div>

          <FilterGroup className="checkbox-group" style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="show-deleted-toggle"
              checked={showDeleted}
              onChange={(e) => {
                setShowDeleted(e.target.checked);
                loadLedger(1);
              }}
            />
            <label htmlFor="show-deleted-toggle" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 0, cursor: "pointer" }}>
              عرض المحذوفات
            </label>
          </FilterGroup>
        </FilterSection>
      )}

      {/* Stats Cards */}
      <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-icon alert">{getIcon("dollar")}</div>
          <div className="stat-info">
            <h3>إجمالي المبيعات (مدين)</h3>
            <p className="text-danger">{formatCurrency(stats.total_debit)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon products">{getIcon("check")}</div>
          <div className="stat-info">
            <h3>إجمالي المقبوضات (دائن)</h3>
            <p className="text-success">{formatCurrency(stats.total_credit)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total">{getIcon("building")}</div>
          <div className="stat-info">
            <h3>الرصيد الحالي</h3>
            <p className={stats.balance > 0 ? "text-danger" : stats.balance < 0 ? "text-success" : ""}>
              {formatCurrency(stats.balance)}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon sales">{getIcon("eye")}</div>
          <div className="stat-info">
            <h3>عدد العمليات</h3>
            <p>{stats.transaction_count}</p>
          </div>
        </div>
      </div>

      <div id="alert-container"></div>

      <div className="sales-card animate-fade">
        <SelectableInvoiceTable
          columns={columns}
          invoices={transactions}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          onSelectionChange={handleReturnSelection}
          onSearch={(query) => setFilters({ ...filters, search: query })}
          getInvoiceItems={getInvoiceItems}
          emptyMessage="لا توجد عمليات"
          multiInvoiceSelection={true}
          isExpandable={(item: LedgerTransaction) => !!item.reference_id && (item.reference_type === "invoices" || item.reference_type === "sales_returns")}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: loadLedger,
          }}
          openReturnDialog={openReturnDialog}
        />
      </div>

      {/* Filter Dialog */}
      <Dialog
        isOpen={filterDialog}
        onClose={() => setFilterDialog(false)}
        title="تصفية العمليات"
        footer={
          <FilterActions>
            <Button variant="secondary" onClick={() => setFilterDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={applyFilters}>
              تطبيق
            </Button>
          </FilterActions>
        }
      >
        <div className="form-group">
          <FilterGroup label="الفترة">
            <DateRangePicker
              startDate={filters.date_from}
              endDate={filters.date_to}
              onStartDateChange={(val) => setFilters({ ...filters, date_from: val })}
              onEndDateChange={(val) => setFilters({ ...filters, date_to: val })}
            />
          </FilterGroup>
        </div>
        <div className="form-group">
          <FilterGroup label="نوع العملية">
            <select
              id="filter-type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">الكل</option>
              <option value="invoice">فاتورة مبيعات</option>
              <option value="payment">سند قبض (دفعة)</option>
              <option value="return">مرتجع</option>
            </select>
          </FilterGroup>
        </div>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog
        isOpen={transactionDialog}
        onClose={() => setTransactionDialog(false)}
        title={currentTransactionId ? "تعديل عملية" : "تسجيل عملية جديدة"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTransactionDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={saveTransaction}>
              حفظ
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveTransaction();
          }}
        >
          <div className="form-group">
            <label htmlFor="trans-type">نوع العملية *</label>
            <select
              id="trans-type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as typeof transactionType)}
              required
              disabled={!!currentTransactionId}
            >
              <option value="payment">سند قبض (استلام نقدية)</option>
              <option value="invoice">فاتورة (أجل) - يدوي</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="trans-amount">المبلغ *</label>
            <input
              type="number"
              step="0.01"
              id="trans-amount"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="trans-date">التاريخ *</label>
            <input
              type="date"
              id="trans-date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              disabled={!!currentTransactionId}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="trans-desc">الوصف / البيان</label>
            <textarea
              id="trans-desc"
              rows={3}
              value={transactionDescription}
              onChange={(e) => setTransactionDescription(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        isOpen={viewDialog}
        onClose={() => setViewDialog(false)}
        title="تفاصيل الفاتورة"
      // size="large"
      >
        {selectedInvoice && (
          <div>
            <div style={{ marginBottom: "2rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "1rem" }}>
              <div className="form-row">
                <div className="summary-stat">
                  <span className="stat-label">رقم الفاتورة</span>
                  <span className="stat-value">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">التاريخ</span>
                  <span className="stat-value">{formatDate(selectedInvoice.created_at)}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">نوع الدفع</span>
                  <span className="stat-value">
                    <span
                      className={`badge ${selectedInvoice.payment_type === "credit" ? "badge-warning" : "badge-success"
                        }`}
                    >
                      {selectedInvoice.payment_type === "credit" ? "آجل (ذمم)" : "نقدي"}
                    </span>
                  </span>
                </div>
              </div>
              {selectedInvoice.customer_name && (
                <div
                  className="form-row"
                  style={{
                    marginTop: "1rem",
                    background: "var(--surface-hover)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div className="summary-stat">
                    <span className="stat-label">العميل</span>
                    <span className="stat-value">{selectedInvoice.customer_name}</span>
                  </div>
                  {selectedInvoice.customer_phone && (
                    <div className="summary-stat">
                      <span className="stat-label">الهاتف</span>
                      <span className="stat-value">{selectedInvoice.customer_phone}</span>
                    </div>
                  )}
                  {selectedInvoice.customer_tax && (
                    <div className="summary-stat">
                      <span className="stat-label">الرقم الضريبي</span>
                      <span className="stat-value">{selectedInvoice.customer_tax}</span>
                    </div>
                  )}
                </div>
              )}
              {selectedInvoice.payment_type === "credit" && (
                <div className="form-row" style={{ marginTop: "1rem" }}>
                  <div className="summary-stat">
                    <span className="stat-label">المبلغ المدفوع</span>
                    <span className="stat-value" style={{ color: "var(--success-color)" }}>
                      {formatCurrency(selectedInvoice.amount_paid || 0)}
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">المبلغ المتبقي</span>
                    <span
                      className="stat-value"
                      style={{ color: "var(--danger-color)", fontWeight: 700 }}
                    >
                      {formatCurrency(
                        selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 style={{ marginBottom: "1rem" }}>المنتجات المباعة:</h4>
              {selectedInvoice.items.map((item, idx) => (
                <div key={idx} className="item-row-minimal">
                  <div className="item-info-pkg">
                    <span className="item-name-pkg">{item.product_name}</span>
                    <span className="item-meta-pkg">سعر الوحدة: {formatCurrency(item.unit_price)}</span>
                  </div>
                  <div className="item-info-pkg" style={{ textAlign: "left" }}>
                    <span className="item-name-pkg">{formatCurrency(item.subtotal)}</span>
                    <span className="item-meta-pkg">الكمية: {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="sales-summary-bar"
              style={{
                marginTop: "2rem",
                background: "var(--grad-primary)",
                color: "white",
              }}
            >
              <div className="summary-stat">
                <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>
                  المبلغ الإجمالي
                </span>
                <span className="stat-value highlight" style={{ color: "white" }}>
                  {formatCurrency(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => {
          setConfirmDialog(false);
          setDeleteTransactionId(null);
          setRestoreTransactionId(null);
        }}
        onConfirm={handleConfirm}
        title="تأكيد الإجراء"
        message={
          deleteTransactionId
            ? "هل أنت متأكد من حذف هذه العملية (حذف مؤقت)؟"
            : "هل أنت متأكد من استعادة هذه العملية؟"
        }
        confirmText="تأكيد"
        confirmVariant={deleteTransactionId ? "danger" : "primary"}
      />

      {/* Sales Return Dialog */}
      <SalesReturnDialog
        isOpen={returnDialog}
        onClose={() => setReturnDialog(false)}
        selectedItems={selectedReturnItems}
        invoicesMap={invoicesMap}
        onConfirmReturn={handleConfirmReturn}
        onSuccess={() => {
          setReturnDialog(false);
          setSelectedReturnItems([]);
          loadLedger(currentPage);
          loadCustomerDetails();
        }}
      />
    </ModuleLayout>
  );
}

export default function ARLedgerPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">جاري التحميل...</div>}>
      <ARLedgerPageContent />
    </Suspense>
  );
}


