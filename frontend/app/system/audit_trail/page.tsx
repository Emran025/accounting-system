"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { Table, showToast, Column, FilterSection, FilterGroup, DateRangePicker, FilterActions, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/utils";
import { User, getStoredUser } from "@/lib/auth";
import { getIcon } from "@/lib/icons";

interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  module: string;
  description: string;
  ip_address: string;
  created_at: string;
}

const actionTypes = [
  { value: "", label: "جميع الإجراءات" },
  { value: "create", label: "إنشاء" },
  { value: "update", label: "تعديل" },
  { value: "delete", label: "حذف" },
  { value: "login", label: "تسجيل دخول" },
  { value: "logout", label: "تسجيل خروج" },
];

const moduleTypes = [
  { value: "", label: "جميع الوحدات" },
  { value: "auth", label: "المصادقة" },
  { value: "sales", label: "المبيعات" },
  { value: "products", label: "المنتجات" },
  { value: "purchases", label: "المشتريات" },
  { value: "expenses", label: "المصروفات" },
  { value: "users", label: "المستخدمين" },
  { value: "settings", label: "الإعدادات" },
  { value: "accounts", label: "الحسابات" },
  { value: "vouchers", label: "السندات" },
];

export default function AuditTrailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 20;

  const loadLogs = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(itemsPerPage));
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (actionFilter) params.append("action", actionFilter);
      if (moduleFilter) params.append("module", moduleFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetchAPI(`${API_ENDPOINTS.SYSTEM.AUDIT.LOGS}?${params.toString()}`);
      setLogs(response.logs as AuditLog[] || []);
      setTotalPages(Math.ceil((response.total as number || 0) / itemsPerPage));
      setCurrentPage(page);
    } catch {
      showToast("خطأ في تحميل سجل المراجعة", "error");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, actionFilter, moduleFilter, searchTerm]);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
    loadLogs();
  }, [loadLogs]);

  const handleFilter = () => {
    loadLogs(1);
  };

  const handleExport = () => {
    showToast("جاري تصدير السجل...", "info");
    // Export logic would go here
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <span className="badge badge-success">إنشاء</span>;
      case "update":
        return <span className="badge badge-info">تعديل</span>;
      case "delete":
        return <span className="badge badge-danger">حذف</span>;
      case "login":
        return <span className="badge badge-primary">دخول</span>;
      case "logout":
        return <span className="badge badge-secondary">خروج</span>;
      default:
        return <span className="badge badge-secondary">{action}</span>;
    }
  };

  const getModuleLabel = (module: string) => {
    const found = moduleTypes.find((m) => m.value === module);
    return found?.label || module;
  };

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "التاريخ والوقت",
      dataLabel: "التاريخ والوقت",
      render: (item) => formatDateTime(item.created_at),
    },
    { key: "user_name", header: "المستخدم", dataLabel: "المستخدم" },
    {
      key: "action",
      header: "الإجراء",
      dataLabel: "الإجراء",
      render: (item) => getActionBadge(item.action),
    },
    {
      key: "module",
      header: "الوحدة",
      dataLabel: "الوحدة",
      render: (item) => getModuleLabel(item.module),
    },
    { key: "description", header: "الوصف", dataLabel: "الوصف" },
    { key: "ip_address", header: "عنوان IP", dataLabel: "عنوان IP" },
  ];

  return (
    <MainLayout requiredModule="audit_trail">

      <div className="sales-card animate-fade">
        <PageSubHeader
          actions={
            <Button variant="secondary" onClick={handleExport} icon="download">
              تصدير
            </Button>
          }
        />
        {/* Filters */}
        <FilterSection>
          <DateRangePicker
            label="فترة المراجعة"
            startDate={dateFrom}
            endDate={dateTo}
            onStartDateChange={setDateFrom}
            onEndDateChange={setDateTo}
          />
          <FilterGroup label="الإجراء">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="الوحدة">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              {moduleTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="بحث">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالمستخدم أو الوصف..."
            />
          </FilterGroup>
          <FilterActions>
            <Button onClick={handleFilter} icon="search">
              تصفية
            </Button>
          </FilterActions>
        </FilterSection>

        <Table
          columns={columns}
          data={logs}
          keyExtractor={(item) => item.id}
          emptyMessage="لا توجد سجلات"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: loadLogs,
          }}
        />
      </div>
    </MainLayout>
  );
}

