"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button, SearchableSelect, Select } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface Compliance {
  id: number;
  compliance_number: string;
  compliance_type: string;
  standard_name: string;
  employee_id?: number;
  employee?: { full_name: string };
  status: string;
  due_date?: string;
  completed_date?: string;
}

const typeLabels: Record<string, string> = {
  iso: "ISO",
  soc: "SOC",
  internal_audit: "تدقيق داخلي",
  regulatory: "تنظيمي",
  other: "أخرى",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  non_compliant: "غير متوافق",
  cancelled: "ملغي",
};

const statusBadges: Record<string, string> = {
  pending: "badge-warning",
  in_progress: "badge-info",
  completed: "badge-success",
  non_compliant: "badge-danger",
  cancelled: "badge-secondary",
};

export function QaCompliance() {
  const router = useRouter();
  const [records, setRecords] = useState<Compliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadRecords();
  }, [currentPage, statusFilter]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.QA_COMPLIANCE.BASE}?${query}`);
      setRecords(res.data as Compliance[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load compliance records", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<Compliance>[] = [
    {
      key: "compliance_number",
      header: "رقم الامتثال",
      dataLabel: "رقم الامتثال",
    },
    {
      key: "standard_name",
      header: "اسم المعيار",
      dataLabel: "اسم المعيار",
    },
    {
      key: "compliance_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => typeLabels[item.compliance_type] || item.compliance_type,
    },
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${statusBadges[item.status] || 'badge-secondary'}`}>
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "تاريخ الاستحقاق",
      dataLabel: "تاريخ الاستحقاق",
      render: (item) => item.due_date ? formatDate(item.due_date) : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => router.push(`/hr/qa-compliance/${item.id}`)
            }
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="الجودة والامتثال"
        titleIcon="shield-check"
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "150px" }}
              placeholder="جميع الحالات"
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label })).filter(o => ["pending", "in_progress", "completed", "non_compliant"].includes(o.value))}
            />
            <Button
              onClick={() => router.push("/hr/qa-compliance/add")}
              variant="primary"
              icon="plus"
            >
              إضافة سجل امتثال
            </Button>
          </>
        }
      />

      <Table
        columns={columns}
        data={records}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد سجلات امتثال"
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
}


