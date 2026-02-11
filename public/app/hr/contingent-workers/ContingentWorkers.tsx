"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button, SearchableSelect, Select } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface ContingentWorker {
  id: number;
  worker_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  worker_type: string;
  company_name?: string;
  start_date: string;
  end_date?: string;
  status: string;
  hourly_rate?: number;
  monthly_rate?: number;
  badge_expiry?: string;
  system_access_expiry?: string;
}

const workerTypeLabels: Record<string, string> = {
  contractor: "مقاول",
  consultant: "استشاري",
  freelancer: "مستقل",
  temp_agency: "وكالة مؤقتة",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  terminated: "منهي",
};

const statusBadges: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-secondary",
  terminated: "badge-danger",
};

export function ContingentWorkers() {
  const router = useRouter();
  const [workers, setWorkers] = useState<ContingentWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadWorkers();
  }, [currentPage, searchTerm, statusFilter]);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.CONTINGENT_WORKERS.BASE}?${query}`);
      setWorkers(res.data as ContingentWorker[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load contingent workers", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<ContingentWorker>[] = [
    {
      key: "worker_code",
      header: "رمز العامل",
      dataLabel: "رمز العامل",
    },
    {
      key: "full_name",
      header: "الاسم الكامل",
      dataLabel: "الاسم الكامل",
    },
    {
      key: "worker_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => workerTypeLabels[item.worker_type] || item.worker_type,
    },
    {
      key: "company_name",
      header: "الشركة",
      dataLabel: "الشركة",
      render: (item) => item.company_name || '-',
    },
    {
      key: "start_date",
      header: "تاريخ البدء",
      dataLabel: "تاريخ البدء",
      render: (item) => formatDate(item.start_date),
    },
    {
      key: "end_date",
      header: "تاريخ الانتهاء",
      dataLabel: "تاريخ الانتهاء",
      render: (item) => item.end_date ? formatDate(item.end_date) : '-',
    },
    {
      key: "rate",
      header: "المعدل",
      dataLabel: "المعدل",
      render: (item) => {
        if (item.hourly_rate) return formatCurrency(item.hourly_rate) + '/ساعة';
        if (item.monthly_rate) return formatCurrency(item.monthly_rate) + '/شهر';
        return '-';
      },
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
              onClick: () => router.push(`/hr/contingent-workers/${item.id}`)
            },
            {
              icon: "edit",
              title: "تعديل",
              variant: "edit",
              onClick: () => router.push(`/hr/contingent-workers/edit/${item.id}`)
            }
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="العمالة المؤقتة"
        titleIcon="briefcase"
        searchInput={
          <SearchableSelect
            options={[]}
            value={null}
            onChange={() => { }}
            onSearch={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="بحث..."
            className="search-input"
          />
        }
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '150px' }}
              placeholder="جميع الحالات"
              options={[
                { value: 'active', label: 'نشط' },
                { value: 'inactive', label: 'غير نشط' },
                { value: 'terminated', label: 'منهي' }
              ]}
            />
            <Button
              onClick={() => router.push('/hr/contingent-workers/add')}
              variant="primary"
              icon="plus"
            >
              إضافة عامل مؤقت
            </Button>
          </>
        }
      />

      <Table
        columns={columns}
        data={workers}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا يوجد عمالة مؤقتة مسجلة"
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


