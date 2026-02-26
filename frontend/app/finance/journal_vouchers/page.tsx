"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { ActionButtons, Table, Dialog, ConfirmDialog, showToast, Column, Button, NumberInput, SearchableSelect } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess } from "@/lib/auth";
import { getIcon } from "@/lib/icons";

interface Account {
  id: number;
  code: string;
  name: string;
}

interface VoucherLine {
  account_id: number;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
}

interface Voucher {
  id: number;
  voucher_number: string;
  voucher_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: "draft" | "posted";
  lines: VoucherLine[];
  created_at: string;
}

export default function JournalVouchersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [formDialog, setFormDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form
  const [formData, setFormData] = useState({
    voucher_date: new Date().toISOString().split("T")[0],
    description: "",
    lines: [
      { account_id: "", debit: "", credit: "", description: "" },
      { account_id: "", debit: "", credit: "", description: "" },
    ] as Array<{ account_id: string; debit: string; credit: string; description: string }>,
  });

  const itemsPerPage = 10;

  const loadVouchers = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.BASE}?page=${page}&limit=${itemsPerPage}`);
      setVouchers(response.vouchers as Voucher[] || []);
      setTotalPages(Math.ceil((response.total as number || 0) / itemsPerPage));
      setCurrentPage(page);
    } catch {
      showToast("خطأ في تحميل السندات", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.ACCOUNTS.BASE}?is_active=true`);
      setAccounts(response.accounts as Account[] || []);
    } catch {
      console.error("Error loading accounts");
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedPermissions = getStoredPermissions();
    setUser(storedUser);
    setPermissions(storedPermissions);
    loadVouchers();
    loadAccounts();
  }, [loadVouchers, loadAccounts]);

  const openAddDialog = () => {
    setSelectedVoucher(null);
    setFormData({
      voucher_date: new Date().toISOString().split("T")[0],
      description: "",
      lines: [
        { account_id: "", debit: "", credit: "", description: "" },
        { account_id: "", debit: "", credit: "", description: "" },
      ],
    });
    setFormDialog(true);
  };

  const openViewDialog = async (voucher: Voucher) => {
    try {
      const response = await fetchAPI(API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.withId(voucher.id));
      setSelectedVoucher(response.voucher as Voucher || voucher);
      setViewDialog(true);
    } catch {
      showToast("خطأ في تحميل تفاصيل السند", "error");
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: "", debit: "", credit: "", description: "" }],
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) {
      showToast("يجب أن يحتوي السند على سطرين على الأقل", "error");
      return;
    }
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const getTotalDebit = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  };

  const getTotalCredit = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebit() - getTotalCredit()) < 0.01;
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      showToast("يرجى إدخال وصف السند", "error");
      return;
    }

    const validLines = formData.lines.filter(
      (line) => line.account_id && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)
    );

    if (validLines.length < 2) {
      showToast("يجب إدخال سطرين على الأقل", "error");
      return;
    }

    if (!isBalanced()) {
      showToast("السند غير متوازن - المدين لا يساوي الدائن", "error");
      return;
    }

    const payload = {
      voucher_date: formData.voucher_date,
      description: formData.description,
      lines: validLines.map((line) => ({
        account_id: parseInt(line.account_id),
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        description: line.description,
      })),
    };

    try {
      await fetchAPI(API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.BASE, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("تم إنشاء السند بنجاح", "success");
      setFormDialog(false);
      loadVouchers(currentPage);
    } catch {
      showToast("خطأ في حفظ السند", "error");
    }
  };

  const postVoucher = async (id: number) => {
    try {
      await fetchAPI(API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.POST(id), { method: "POST" });
      showToast("تم ترحيل السند", "success");
      loadVouchers(currentPage);
    } catch {
      showToast("خطأ في ترحيل السند", "error");
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setConfirmDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await fetchAPI(API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.withId(deleteId), { method: "DELETE" });
      showToast("تم حذف السند", "success");
      loadVouchers(currentPage);
    } catch {
      showToast("خطأ في حذف السند", "error");
    }
  };

  const columns: Column<Voucher>[] = [
    { key: "voucher_number", header: "رقم السند", dataLabel: "رقم السند" },
    {
      key: "voucher_date",
      header: "التاريخ",
      dataLabel: "التاريخ",
      render: (item) => formatDate(item.voucher_date),
    },
    { key: "description", header: "الوصف", dataLabel: "الوصف" },
    {
      key: "total_debit",
      header: "المدين",
      dataLabel: "المدين",
      render: (item) => formatCurrency(item.total_debit),
    },
    {
      key: "total_credit",
      header: "الدائن",
      dataLabel: "الدائن",
      render: (item) => formatCurrency(item.total_credit),
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${item.status === "posted" ? "badge-success" : "badge-warning"}`}>
          {item.status === "posted" ? "مرحل" : "مسودة"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض",
              variant: "view",
              onClick: () => openViewDialog(item)
            },
            {
              icon: "check",
              title: "ترحيل",
              variant: "edit",
              onClick: () => postVoucher(item.id),
              hidden: item.status !== "draft" || !canAccess(permissions, "journal_vouchers", "edit")
            },
            {
              icon: "trash",
              title: "حذف",
              variant: "delete",
              onClick: () => confirmDelete(item.id),
              hidden: item.status !== "draft" || !canAccess(permissions, "journal_vouchers", "delete")
            }
          ]}
        />
      ),
    },
  ];

  const voucherLineColumns: Column<any>[] = [
    {
      key: "account_id",
      header: "الحساب",
      render: (line, index) => (
        <Select
          value={line.account_id}
          onChange={(e) => updateLine(index, "account_id", e.target.value)}
          className="w-full"
          options={[
            { value: "", label: "اختر حساب" },
            ...accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))
          ]}
        />
      ),
    },
    {
      key: "debit",
      header: "مدين",
      render: (line, index) => (
        <NumberInput
          value={line.debit}
          onChange={(val) => updateLine(index, "debit", val)}
          min={0}
          step={0.01}
          className="w-full"
        />
      ),
    },
    {
      key: "credit",
      header: "دائن",
      render: (line, index) => (
        <NumberInput
          value={line.credit}
          onChange={(val) => updateLine(index, "credit", val)}
          min={0}
          step={0.01}
          className="w-full"
        />
      ),
    },
    {
      key: "description",
      header: "البيان",
      render: (line, index) => (
        <TextInput
          value={line.description}
          onChange={(e) => updateLine(index, "description", e.target.value)}
          placeholder="بيان اختياري..."
          className="w-full"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, index) => (
        <button
          type="button"
          className="icon-btn delete"
          onClick={() => removeLine(index)}
          disabled={formData.lines.length <= 2}
        >
          {getIcon("trash")}
        </button>
      ),
    },
  ];

  const viewVoucherColumns: Column<VoucherLine>[] = [
    { key: "account_name", header: "الحساب", dataLabel: "الحساب" },
    {
      key: "debit",
      header: "مدين",
      dataLabel: "مدين",
      render: (item) => (item.debit > 0 ? formatCurrency(item.debit) : "-"),
    },
    {
      key: "credit",
      header: "دائن",
      dataLabel: "دائن",
      render: (item) => (item.credit > 0 ? formatCurrency(item.credit) : "-"),
    },
    {
      key: "description",
      header: "البيان",
      dataLabel: "البيان",
      render: (item) => item.description || "-",
    },
  ];

  return (
    <MainLayout>


      <div className="sales-card animate-fade">
        <PageSubHeader
          user={user}
          actions={
            canAccess(permissions, "journal_vouchers", "create") && (
              <Button icon="plus" onClick={openAddDialog}>
                إنشاء سند
              </Button>
            )
          }
        />
        <Table
          columns={columns}
          data={vouchers}
          keyExtractor={(item) => item.id}
          emptyMessage="لا توجد سندات"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: loadVouchers,
          }}
        />
      </div>

      {/* Form Dialog */}
      <Dialog
        isOpen={formDialog}
        onClose={() => setFormDialog(false)}
        title="إنشاء سند قيد"
        maxWidth="800px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="form-row">
          <TextInput
            type="date"
            label="التاريخ *"
            id="voucher_date"
            value={formData.voucher_date}
            onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
            className="flex-1"
          />
          <TextInput
            label="الوصف *"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="flex-[2]"
          />
        </div>

        <h4 style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>بنود السند</h4>

        <Table
          columns={voucherLineColumns}
          data={formData.lines}
          keyExtractor={(_, index) => index}
          emptyMessage="لا توجد بنود"
        />

        <Button
          variant="secondary"
          onClick={addLine}
          icon="plus"
          style={{ marginTop: "1rem" }}
        >
          إضافة سطر
        </Button>

        <div className="summary-stat-box" style={{ marginTop: "1.5rem" }}>
          <div className="stat-item">
            <span className="stat-label">إجمالي المدين</span>
            <span className="stat-value">{formatCurrency(getTotalDebit())}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">إجمالي الدائن</span>
            <span className="stat-value">{formatCurrency(getTotalCredit())}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">الفرق</span>
            <span className={`stat-value ${isBalanced() ? "text-success" : "text-danger"}`}>
              {formatCurrency(Math.abs(getTotalDebit() - getTotalCredit()))}
              {isBalanced() && " ✓"}
            </span>
          </div>
        </div>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        isOpen={viewDialog}
        onClose={() => setViewDialog(false)}
        title={`سند قيد رقم ${selectedVoucher?.voucher_number || ""}`}
        maxWidth="700px"
      >
        {selectedVoucher && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <p><strong>التاريخ:</strong> {formatDate(selectedVoucher.voucher_date)}</p>
              <p><strong>الوصف:</strong> {selectedVoucher.description}</p>
              <p>
                <strong>الحالة:</strong>{" "}
                <span className={`badge ${selectedVoucher.status === "posted" ? "badge-success" : "badge-warning"}`}>
                  {selectedVoucher.status === "posted" ? "مرحل" : "مسودة"}
                </span>
              </p>
            </div>

            <Table
              columns={viewVoucherColumns}
              data={selectedVoucher.lines || []}
              keyExtractor={(_, index) => index}
            />

            <div className="summary-stat-box" style={{ marginTop: "1.5rem" }}>
              <div className="stat-item">
                <span className="stat-label">إجمالي المدين</span>
                <span className="stat-value">{formatCurrency(selectedVoucher.total_debit)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">إجمالي الدائن</span>
                <span className="stat-value">{formatCurrency(selectedVoucher.total_credit)}</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا السند؟"
        confirmText="حذف"
        confirmVariant="danger"
      />
    </MainLayout>
  );
}

