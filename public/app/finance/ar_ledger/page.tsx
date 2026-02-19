"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { ConfirmDialog, showToast, showAlert, Button, SelectedItem, SalesReturnDialog, SelectableInvoice, SelectableInvoiceItem, ReturnData } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { parseNumber } from "@/lib/utils";
import { User, getStoredUser, checkAuth } from "@/lib/auth";

import { CustomerInfoSection } from "./components/CustomerInfoSection";
import { LedgerStatsCards } from "./components/LedgerStatsCards";
import { LedgerTable } from "./components/LedgerTable";
import { LedgerFilterDialog } from "./components/LedgerFilterDialog";
import { TransactionFormDialog } from "./components/TransactionFormDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";
import { LedgerTransaction, Pagination, LedgerStats, Customer, DetailedInvoice } from "./types";

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
    total_returns: 0,
    total_receipts: 0,
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
  const [transactionType, setTransactionType] = useState<"receipt" | "invoice">("receipt");
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
            type: item.type,
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
    setTransactionType("receipt");
    setTransactionAmount("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setTransactionDescription("");
    setTransactionDialog(true);
  };

  const openEditTransaction = (transaction: LedgerTransaction) => {
    setCurrentTransactionId(transaction.id);
    setTransactionType(transaction.type === "invoice" ? "invoice" : "receipt");
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
    if (item.type === "receipt") return [];
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
    } catch (error: any) {
      showToast(error.message || "خطأ في تسجيل المرتجع", "error");
      throw error;
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

      <CustomerInfoSection
        customer={customer}
        showDeleted={showDeleted}
        onShowDeletedChange={(checked) => {
          setShowDeleted(checked);
          loadLedger(1);
        }}
      />

      <LedgerStatsCards stats={stats} />

      <div id="alert-container"></div>

      <LedgerTable
        transactions={transactions}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        handleReturnSelection={handleReturnSelection}
        setSearch={(query) => setFilters({ ...filters, search: query })}
        onPageChange={loadLedger}
        getInvoiceItems={getInvoiceItems}
        openReturnDialog={openReturnDialog}
        onViewInvoice={viewInvoice}
        onEditTransaction={openEditTransaction}
        onDeleteTransaction={confirmDeleteTransaction}
        onRestoreTransaction={confirmRestoreTransaction}
      />

      <LedgerFilterDialog
        isOpen={filterDialog}
        onClose={() => setFilterDialog(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={applyFilters}
      />

      <TransactionFormDialog
        isOpen={transactionDialog}
        onClose={() => setTransactionDialog(false)}
        isCustomId={!!currentTransactionId}
        transactionType={transactionType}
        transactionAmount={transactionAmount}
        transactionDate={transactionDate}
        transactionDescription={transactionDescription}
        setTransactionType={setTransactionType}
        setTransactionAmount={setTransactionAmount}
        setTransactionDate={setTransactionDate}
        setTransactionDescription={setTransactionDescription}
        onSave={saveTransaction}
      />

      <InvoiceDetailsDialog
        isOpen={viewDialog}
        onClose={() => setViewDialog(false)}
        selectedInvoice={selectedInvoice}
      />

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
