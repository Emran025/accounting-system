"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { ActionButtons, Table, Dialog, ConfirmDialog, showToast, Column, showAlert, Button } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate } from "@/lib/utils";
import { User, getStoredUser, checkAuth } from "@/lib/auth";

interface FiscalPeriod {
  id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  is_closed: boolean;
}

export default function FiscalPeriodsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [periodDialog, setPeriodDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "lock" | "unlock" | "close";
    periodId: number;
  } | null>(null);

  // Form
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null);
  const [periodName, setPeriodName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const itemsPerPage = 20;

  const loadPeriods = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE}?page=${page}&limit=${itemsPerPage}`);
      if (response.success && response.data) {
        setPeriods(response.data as FiscalPeriod[]);
        const total = Number(response.total) || 0;
        setTotalPages(Math.ceil(total / itemsPerPage));
        setCurrentPage(page);
      } else {
        showAlert("alert-container", response.message || "فشل تحميل الفترات المالية", "error");
      }
    } catch {
      showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkAuth();
      if (!authenticated) return;

      const storedUser = getStoredUser();
      setUser(storedUser);
      await loadPeriods();
    };
    init();
  }, [loadPeriods]);

  const openCreateDialog = () => {
    setCurrentPeriodId(null);
    setPeriodName("");
    setPeriodStart("");
    setPeriodEnd("");
    setPeriodDialog(true);
  };

  const viewPeriod = async (id: number) => {
    try {
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE}?id=${id}`);
      if (response.success && response.data) {
        const period = Array.isArray(response.data) ? response.data[0] : response.data;
        if (period) {
          alert(
            `اسم الفترة: ${period.period_name}\nمن: ${formatDate(period.start_date)}\nإلى: ${formatDate(period.end_date)}\nمقفلة: ${period.is_locked ? "نعم" : "لا"}\nمغلقة: ${period.is_closed ? "نعم" : "لا"}`
          );
        }
      }
    } catch {
      showToast("خطأ في تحميل الفترة", "error");
    }
  };

  const editPeriod = async (id: number) => {
    try {
      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE}?id=${id}`);
      if (response.success && response.data) {
        const period = Array.isArray(response.data) ? response.data[0] : response.data;
        if (!period) {
          showAlert("alert-container", "الفترة غير موجودة", "error");
          return;
        }

        setCurrentPeriodId(period.id);
        setPeriodName(period.period_name);
        setPeriodStart(period.start_date);
        setPeriodEnd(period.end_date);
        setPeriodDialog(true);
      }
    } catch {
      showAlert("alert-container", "خطأ في تحميل الفترة", "error");
    }
  };

  const savePeriod = async () => {
    if (!periodName || !periodStart || !periodEnd) {
      showAlert("alert-container", "يرجى ملء جميع الحقول", "error");
      return;
    }

    try {
      const body: any = {
        period_name: periodName,
        start_date: periodStart,
        end_date: periodEnd,
      };
      if (currentPeriodId) body.id = currentPeriodId;

      const response = await fetchAPI(API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE, {
        method: currentPeriodId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });

      if (response.success) {
        showAlert("alert-container", "تم الحفظ بنجاح", "success");
        setPeriodDialog(false);
        await loadPeriods(currentPage);
      } else {
        showAlert("alert-container", response.message || "فشل الحفظ", "error");
      }
    } catch {
      showAlert("alert-container", "خطأ في الحفظ", "error");
    }
  };

  const confirmLockPeriod = (id: number) => {
    setConfirmAction({ type: "lock", periodId: id });
    setConfirmDialog(true);
  };

  const confirmUnlockPeriod = (id: number) => {
    setConfirmAction({ type: "unlock", periodId: id });
    setConfirmDialog(true);
  };

  const confirmClosePeriod = (id: number) => {
    setConfirmAction({ type: "close", periodId: id });
    setConfirmDialog(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    const messages = {
      lock: "هل أنت متأكد من قفل هذه الفترة؟ لن يمكن إضافة قيود جديدة.",
      unlock: "هل أنت متأكد من فتح هذه الفترة؟ سيتم السماح بإضافة قيود جديدة.",
      close: "هل أنت متأكد من إغلاق هذه الفترة؟ سيتم إنشاء قيود الإغلاق ولن يمكن تعديل الفترة.",
    };

    try {
      let endpoint = "";
      if (confirmAction.type === 'lock') endpoint = API_ENDPOINTS.FINANCE.FISCAL_PERIODS.LOCK;
      else if (confirmAction.type === 'unlock') endpoint = API_ENDPOINTS.FINANCE.FISCAL_PERIODS.UNLOCK;
      else if (confirmAction.type === 'close') endpoint = API_ENDPOINTS.FINANCE.FISCAL_PERIODS.CLOSE;

      const response = await fetchAPI(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ id: confirmAction.periodId }),
        }
      );

      if (response.success) {
        const successMessages = {
          lock: "تم قفل الفترة بنجاح",
          unlock: "تم فتح الفترة بنجاح",
          close: "تم إغلاق الفترة بنجاح",
        };
        showAlert("alert-container", successMessages[confirmAction.type], "success");
        setConfirmDialog(false);
        setConfirmAction(null);
        await loadPeriods(currentPage);
      } else {
        showAlert("alert-container", response.message || "فشل العملية", "error");
      }
    } catch {
      showAlert("alert-container", "خطأ في تنفيذ العملية", "error");
    }
  };

  const getStatusBadge = (period: FiscalPeriod) => {
    if (period.is_closed) {
      return <span className="badge badge-danger">مغلقة</span>;
    } else if (period.is_locked) {
      return <span className="badge badge-warning">مقفلة</span>;
    }
    return <span className="badge badge-success">نشطة</span>;
  };

  const columns: Column<FiscalPeriod>[] = [
    {
      key: "period_name",
      header: "اسم الفترة",
      dataLabel: "اسم الفترة",
      render: (item) => <strong>{item.period_name}</strong>,
    },
    {
      key: "start_date",
      header: "تاريخ البداية",
      dataLabel: "تاريخ البداية",
      render: (item) => formatDate(item.start_date),
    },
    {
      key: "end_date",
      header: "تاريخ النهاية",
      dataLabel: "تاريخ النهاية",
      render: (item) => formatDate(item.end_date),
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => getStatusBadge(item),
    },
    {
      key: "is_locked",
      header: "مقفلة",
      dataLabel: "مقفلة",
      render: (item) => (item.is_locked ? "✓" : "✗"),
    },
    {
      key: "is_closed",
      header: "مغلقة",
      dataLabel: "مغلقة",
      render: (item) => (item.is_closed ? "✓" : "✗"),
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
              onClick: () => viewPeriod(item.id)
            },
            {
              icon: item.is_locked ? "unlock" : "lock",
              title: item.is_locked ? "فتح" : "قفل",
              variant: "view",
              onClick: () => (item.is_locked ? confirmUnlockPeriod(item.id) : confirmLockPeriod(item.id)),
              hidden: item.is_closed
            },
            {
              icon: "edit",
              title: "تعديل",
              variant: "edit",
              onClick: () => editPeriod(item.id),
              hidden: item.is_closed || item.is_locked
            },
            {
              icon: "check",
              title: "إغلاق",
              variant: "delete", // Closing is a "danger" action here
              onClick: () => confirmClosePeriod(item.id),
              hidden: item.is_closed
            }
          ]}
        />
      ),
    },
  ];

  return (
    <ModuleLayout groupKey="finance" requiredModule="fiscal_periods">
      <PageHeader
        title="الفترات المالية"
        user={user}
        actions={
          <Button variant="primary" icon="plus" onClick={openCreateDialog}>
            فترة جديدة
          </Button>
        }
      />

      <div id="alert-container"></div>

      <div className="sales-card animate-fade">
        <Table
          columns={columns}
          data={periods}
          keyExtractor={(item) => item.id}
          emptyMessage="لا توجد فترات مالية"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: loadPeriods,
          }}
        />
      </div>

      {/* Period Dialog */}
      <Dialog
        isOpen={periodDialog}
        onClose={() => setPeriodDialog(false)}
        title={currentPeriodId ? "تعديل الفترة" : "فترة مالية جديدة"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPeriodDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={savePeriod}>
              حفظ
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            savePeriod();
          }}
          className="space-y-4"
        >
          <TextInput
            label="اسم الفترة *"
            id="period-name"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            required
          />

          <div className="form-row">
            <TextInput
              type="date"
              label="تاريخ البداية *"
              id="period-start"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
              className="flex-1"
            />
            <TextInput
              type="date"
              label="تاريخ النهاية *"
              id="period-end"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
              className="flex-1"
            />
          </div>
        </form>
      </Dialog>

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => {
          setConfirmDialog(false);
          setConfirmAction(null);
        }}
        onConfirm={executeAction}
        title="تأكيد العملية"
        message={
          confirmAction?.type === "lock"
            ? "هل أنت متأكد من قفل هذه الفترة؟ لن يمكن إضافة قيود جديدة."
            : confirmAction?.type === "unlock"
              ? "هل أنت متأكد من فتح هذه الفترة؟ سيتم السماح بإضافة قيود جديدة."
              : "هل أنت متأكد من إغلاق هذه الفترة؟ سيتم إنشاء قيود الإغلاق ولن يمكن تعديل الفترة."
        }
        confirmText="تأكيد"
        confirmVariant={confirmAction?.type === "close" ? "danger" : "primary"}
      />
    </ModuleLayout>
  );
}

